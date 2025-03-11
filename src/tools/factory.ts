import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ADOApiClient } from '../api/client/index.js';
import { Tool, ToolDefinition } from './registry.js';

/**
 * Operation type for entity tools
 */
export type OperationType = 'list' | 'get' | 'create' | 'update' | 'delete';

/**
 * Base class for entity tools
 * Provides common functionality for all entity tools
 */
export abstract class EntityTool implements Tool {
  protected apiClient: ADOApiClient;
  protected name: string;
  protected description: string;
  protected operations: Record<string, (params: any) => Promise<any>>;
  protected schemas: Record<string, z.ZodType<any>>;

  /**
   * Create a new entity tool
   * @param apiClient API client
   * @param name Tool name
   * @param description Tool description
   */
  constructor(apiClient: ADOApiClient, name: string, description: string) {
    this.apiClient = apiClient;
    this.name = name;
    this.description = description;
    this.operations = {};
    this.schemas = {};
  }

  /**
   * Get the tool definition
   * @returns Tool definition
   */
  getDefinition(): ToolDefinition {
    // Build input schema based on registered operations
    const properties: Record<string, any> = {
      operation: {
        type: 'string',
        enum: Object.keys(this.operations),
        description: 'Operation to perform',
      },
    };

    // Add operation-specific parameters
    for (const operation of Object.keys(this.operations)) {
      properties[`${operation}Params`] = {
        type: 'object',
        description: `Parameters for ${operation} operation`,
      };
    }

    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties,
        required: ['operation'],
        additionalProperties: false,
      },
    };
  }

  /**
   * Execute the tool
   * @param args Tool arguments
   * @returns Tool result
   */
  async execute(args: unknown): Promise<any> {
    try {
      // Validate basic structure
      const baseSchema = z.object({
        operation: z.string(),
      }).passthrough();
      
      const baseParams = baseSchema.parse(args);
      const operation = baseParams.operation;
      
      // Check if operation exists
      if (!this.operations[operation]) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid operation: ${operation}. Available operations: ${Object.keys(this.operations).join(', ')}`
        );
      }
      
      // Get operation-specific parameters
      const paramsKey = `${operation}Params`;
      const operationParams = (args as any)[paramsKey] || {};
      
      // Validate operation-specific parameters
      const schema = this.schemas[operation];
      const validParams = schema ? schema.parse(operationParams) : operationParams;
      
      // Execute operation
      const result = await this.operations[operation](validParams);
      
      // Format result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.message}`
        );
      }
      
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute ${this.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Register an operation
   * @param operation Operation name
   * @param handler Operation handler
   * @param schema Schema for operation parameters
   */
  protected registerOperation(
    operation: string,
    handler: (params: any) => Promise<any>,
    schema?: z.ZodType<any>
  ): void {
    this.operations[operation] = handler;
    if (schema) {
      this.schemas[operation] = schema;
    } else {
      // Default to empty object schema if none provided
      this.schemas[operation] = z.object({}).passthrough();
    }
  }
}

/**
 * Factory for creating entity tools
 */
export class EntityToolFactory {
  /**
   * Create a projects tool
   * @param apiClient API client
   * @returns Projects tool
   */
  static createProjectsTool(apiClient: ADOApiClient): EntityTool {
    class ProjectsTool extends EntityTool {
      constructor(apiClient: ADOApiClient) {
        super(apiClient, 'projects', 'Manage Azure DevOps projects');
        
        // Register operations
        this.registerOperation('list', this.listProjects.bind(this), z.object({}).strict());
        this.registerOperation('get', this.getProject.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          includeCapabilities: z.boolean().optional().describe('Include capabilities in the response'),
        }).strict());
      }
      
      async listProjects(params: any): Promise<any> {
        const coreApi = await this.apiClient.getCoreApi();
        const projects = await coreApi.getProjects();
        
        return {
          count: projects.length,
          projects: projects.map((project: any) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            state: project.state,
            visibility: project.visibility,
            lastUpdateTime: project.lastUpdateTime,
            url: project.url,
          })),
        };
      }
      
      async getProject(params: { projectId: string, includeCapabilities?: boolean }): Promise<any> {
        const coreApi = await this.apiClient.getCoreApi();
        const project = await coreApi.getProject(params.projectId, params.includeCapabilities);
        
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
          visibility: project.visibility,
          lastUpdateTime: project.lastUpdateTime,
          url: project.url,
          capabilities: project.capabilities,
        };
      }
    }
    
    return new ProjectsTool(apiClient);
  }
  
  /**
   * Create a repositories tool
   * @param apiClient API client
   * @returns Repositories tool
   */
  static createRepositoriesTool(apiClient: ADOApiClient): EntityTool {
    class RepositoriesTool extends EntityTool {
      constructor(apiClient: ADOApiClient) {
        super(apiClient, 'repositories', 'Manage Git repositories');
        
        // Register operations
        this.registerOperation('list', this.listRepositories.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
        }).strict());
        this.registerOperation('get', this.getRepository.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          repositoryId: z.string().describe('Repository ID or name'),
        }).strict());
        this.registerOperation('listBranches', this.listBranches.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          repositoryId: z.string().describe('Repository ID or name'),
        }).strict());
      }
      
      async listRepositories(params: { projectId: string }): Promise<any> {
        const gitApi = await this.apiClient.getGitApi();
        const repositories = await gitApi.getRepositories(params.projectId);
        
        return {
          count: repositories.length,
          repositories: repositories.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            url: repo.url,
            defaultBranch: repo.defaultBranch,
            size: repo.size,
            remoteUrl: repo.remoteUrl,
            webUrl: repo.webUrl,
          })),
        };
      }
      
      async getRepository(params: { projectId: string, repositoryId: string }): Promise<any> {
        const gitApi = await this.apiClient.getGitApi();
        const repository = await gitApi.getRepository(params.repositoryId, params.projectId);
        
        return {
          id: repository.id,
          name: repository.name,
          url: repository.url,
          defaultBranch: repository.defaultBranch,
          size: repository.size,
          remoteUrl: repository.remoteUrl,
          webUrl: repository.webUrl,
          project: {
            id: repository.project?.id,
            name: repository.project?.name,
          },
        };
      }
      
      async listBranches(params: { projectId: string, repositoryId: string }): Promise<any> {
        try {
          const gitApi = await this.apiClient.getGitApi();
          // Use the correct method for listing branches
          // Note: The actual method might be different depending on the Azure DevOps API
          const refs = await gitApi.getRefs(params.repositoryId, params.projectId, "heads/", false, false);
          
          // Extract branch names from refs
          const branches = refs.map((ref: any) => ({
            name: ref.name.replace('refs/heads/', ''),
            objectId: ref.objectId,
            creator: ref.creator?.displayName,
            url: ref.url,
          }));
          
          return {
            count: branches.length,
            branches,
          };
        } catch (error) {
          console.error('Error listing branches:', error);
          // Return empty result if method not found or other error
          return {
            count: 0,
            branches: [],
            error: `Failed to list branches: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
    }
    
    return new RepositoriesTool(apiClient);
  }
  
  /**
   * Create a work items tool
   * @param apiClient API client
   * @returns Work items tool
   */
  static createWorkItemsTool(apiClient: ADOApiClient): EntityTool {
    class WorkItemsTool extends EntityTool {
      constructor(apiClient: ADOApiClient) {
        super(apiClient, 'workItems', 'Manage work items');
        
        // Register operations
        this.registerOperation('get', this.getWorkItem.bind(this), z.object({
          id: z.number().describe('Work item ID'),
          expand: z.enum(['None', 'Relations', 'Fields', 'Links', 'All']).optional().describe('Expand options'),
        }).strict());
        this.registerOperation('create', this.createWorkItem.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          type: z.string().describe('Work item type (e.g., Bug, Task, User Story)'),
          title: z.string().describe('Work item title'),
          description: z.string().optional().describe('Work item description'),
          assignedTo: z.string().optional().describe('User to assign the work item to'),
        }).strict());
      }
      
      async getWorkItem(params: { id: number, expand?: string }): Promise<any> {
        const workItemApi = await this.apiClient.getWorkItemTrackingApi();
        // Convert string expand to WorkItemExpand enum if needed
        const expandValue = params.expand as any;
        const workItem = await workItemApi.getWorkItem(params.id, undefined, undefined, expandValue);
        
        return {
          id: workItem.id,
          rev: workItem.rev,
          fields: workItem.fields,
          relations: workItem.relations,
          url: workItem.url,
        };
      }
      
      async createWorkItem(params: { 
        projectId: string, 
        type: string, 
        title: string, 
        description?: string, 
        assignedTo?: string 
      }): Promise<any> {
        const workItemApi = await this.apiClient.getWorkItemTrackingApi();
        
        // Create document for work item
        const document = [
          {
            op: 'add',
            path: '/fields/System.Title',
            value: params.title,
          },
        ];
        
        // Add description if provided
        if (params.description) {
          document.push({
            op: 'add',
            path: '/fields/System.Description',
            value: params.description,
          });
        }
        
        // Add assigned to if provided
        if (params.assignedTo) {
          document.push({
            op: 'add',
            path: '/fields/System.AssignedTo',
            value: params.assignedTo,
          });
        }
        
        // Create work item
        const workItem = await workItemApi.createWorkItem(
          undefined,
          document,
          params.projectId,
          params.type,
          false,
          false,
        );
        
        return {
          id: workItem.id,
          rev: workItem.rev,
          fields: workItem.fields,
          url: workItem.url,
        };
      }
    }
    
    return new WorkItemsTool(apiClient);
  }
  
  /**
   * Create a pull requests tool
   * @param apiClient API client
   * @returns Pull requests tool
   */
  static createPullRequestsTool(apiClient: ADOApiClient): EntityTool {
    class PullRequestsTool extends EntityTool {
      constructor(apiClient: ADOApiClient) {
        super(apiClient, 'pullRequests', 'Manage pull requests');
        
        // Register operations
        this.registerOperation('list', this.listPullRequests.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          repositoryId: z.string().describe('Repository ID or name'),
          status: z.enum(['Active', 'Abandoned', 'Completed', 'All']).optional().describe('Pull request status'),
        }).strict());
        this.registerOperation('get', this.getPullRequest.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          repositoryId: z.string().describe('Repository ID or name'),
          pullRequestId: z.number().describe('Pull request ID'),
        }).strict());
      }
      
      async listPullRequests(params: { 
        projectId: string, 
        repositoryId: string, 
        status?: string 
      }): Promise<any> {
        try {
          const gitApi = await this.apiClient.getGitApi();
          const pullRequests = await gitApi.getPullRequests(
            params.repositoryId, 
            { 
              status: params.status as any,
              // Use the correct property for the search criteria
              repositoryId: params.repositoryId,
            }
          );
          
          return {
            count: pullRequests.length,
            pullRequests: pullRequests.map((pr: any) => ({
              pullRequestId: pr.pullRequestId,
              title: pr.title,
              status: pr.status,
              createdBy: pr.createdBy?.displayName,
              creationDate: pr.creationDate,
              sourceRefName: pr.sourceRefName,
              targetRefName: pr.targetRefName,
              url: pr.url,
            })),
          };
        } catch (error) {
          console.error('Error listing pull requests:', error);
          return {
            count: 0,
            pullRequests: [],
            error: `Failed to list pull requests: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
      
      async getPullRequest(params: { 
        projectId: string, 
        repositoryId: string, 
        pullRequestId: number 
      }): Promise<any> {
        try {
          const gitApi = await this.apiClient.getGitApi();
          const pullRequest = await gitApi.getPullRequestById(params.pullRequestId, params.projectId);
          
          return {
            pullRequestId: pullRequest.pullRequestId,
            title: pullRequest.title,
            description: pullRequest.description,
            status: pullRequest.status,
            createdBy: pullRequest.createdBy?.displayName,
            creationDate: pullRequest.creationDate,
            sourceRefName: pullRequest.sourceRefName,
            targetRefName: pullRequest.targetRefName,
            mergeStatus: pullRequest.mergeStatus,
            isDraft: pullRequest.isDraft,
            url: pullRequest.url,
          };
        } catch (error) {
          console.error('Error getting pull request:', error);
          return {
            error: `Failed to get pull request: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
    }
    
    return new PullRequestsTool(apiClient);
  }
  
  /**
   * Create a pipelines tool
   * @param apiClient API client
   * @returns Pipelines tool
   */
  static createPipelinesTool(apiClient: ADOApiClient): EntityTool {
    class PipelinesTool extends EntityTool {
      constructor(apiClient: ADOApiClient) {
        super(apiClient, 'pipelines', 'Manage pipelines');
        
        // Register operations
        this.registerOperation('list', this.listPipelines.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
        }).strict());
        this.registerOperation('get', this.getPipeline.bind(this), z.object({
          projectId: z.string().describe('Project ID or name'),
          pipelineId: z.number().describe('Pipeline ID'),
        }).strict());
      }
      
      async listPipelines(params: { projectId: string }): Promise<any> {
        try {
          const pipelineApi = await this.apiClient.getPipelineApi();
          // The actual method might be different depending on the Azure DevOps API
          const pipelines = await pipelineApi.listPipelines(params.projectId);
          
          return {
            count: pipelines.length,
            pipelines: pipelines.map((pipeline: any) => ({
              id: pipeline.id,
              name: pipeline.name,
              folder: pipeline.folder,
              revision: pipeline.revision,
              url: pipeline.url,
            })),
          };
        } catch (error) {
          console.error('Error listing pipelines:', error);
          return {
            count: 0,
            pipelines: [],
            error: `Failed to list pipelines: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
      
      async getPipeline(params: { projectId: string, pipelineId: number }): Promise<any> {
        try {
          const pipelineApi = await this.apiClient.getPipelineApi();
          // The actual method might be different depending on the Azure DevOps API
          const pipeline = await pipelineApi.getPipeline(params.projectId, params.pipelineId);
          
          return {
            id: pipeline.id,
            name: pipeline.name,
            folder: pipeline.folder,
            revision: pipeline.revision,
            url: pipeline.url,
          };
        } catch (error) {
          console.error('Error getting pipeline:', error);
          return {
            error: `Failed to get pipeline: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }
    }
    
    return new PipelinesTool(apiClient);
  }
}
