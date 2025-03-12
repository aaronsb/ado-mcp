import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ADOApiClient } from '../api/client/index.js';
import { createError, ErrorCategory, handleApiError, normalizePaginationParams, PaginationParams } from '../api/utils/index.js';
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
   * Get the tool definition with enhanced descriptions
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

    // Add operation-specific parameters with enhanced descriptions
    for (const operation of Object.keys(this.operations)) {
      const schema = this.schemas[operation];
      let schemaProperties: Record<string, any> = {};
      let schemaRequired: string[] = [];
      
      if (schema instanceof z.ZodObject) {
        const schemaDescription = this.generateSchemaDescription(schema);
        schemaProperties = schemaDescription.properties;
        schemaRequired = schemaDescription.required;
      }
      
      properties[`${operation}Params`] = {
        type: 'object',
        description: this.operationDescriptions?.[operation] || `Parameters for ${operation} operation`,
        properties: schemaProperties,
        required: schemaRequired,
      };
    }

    // Create enhanced description with examples
    const enhancedDescription = this.generateEnhancedDescription();

    return {
      name: this.name,
      description: enhancedDescription,
      inputSchema: {
        type: 'object',
        properties,
        required: ['operation'],
        additionalProperties: false,
      },
    };
  }

  /**
   * Generate enhanced description with examples
   * @returns Enhanced description
   */
  private generateEnhancedDescription(): string {
    // Start with the base description
    let description = this.description;
    
    // Add available operations
    const operations = Object.keys(this.operations);
    if (operations.length > 0) {
      description += `\n\nAvailable operations:\n`;
      
      for (const operation of operations) {
        const opDescription = this.operationDescriptions?.[operation] || `${operation} operation`;
        description += `- ${operation}: ${opDescription}\n`;
      }
    }
    
    // Add examples if available
    if (this.generateExamples) {
      const examples = this.generateExamples();
      if (examples && examples.length > 0) {
        description += `\n\nExamples:\n`;
        
        for (const example of examples) {
          description += `\n${example}\n`;
        }
      }
    }
    
    return description;
  }
  
  /**
   * Generate examples for the tool
   * This can be overridden by subclasses to provide specific examples
   * @returns Array of example strings
   */
  protected generateExamples(): string[] {
    return [];
  }
  
  /**
   * Generate schema description from Zod schema
   * @param schema Zod schema
   * @returns Schema description
   */
  private generateSchemaDescription(schema: z.ZodObject<any>): { 
    properties: Record<string, any>; 
    required: string[];
  } {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    try {
      // Extract shape from schema
      const shape = schema._def.shape();
      
      // Process each property
      for (const [key, value] of Object.entries(shape)) {
        const fieldDef = (value as any)._def;
        
        // Check if required
        if (!('isOptional' in fieldDef)) {
          required.push(key);
        }
        
        // Get property type and description
        let type = 'string';
        let description = '';
        let enumValues: any[] | undefined = undefined;
        
        if (fieldDef.typeName === 'ZodString') {
          type = 'string';
        } else if (fieldDef.typeName === 'ZodNumber') {
          type = 'number';
        } else if (fieldDef.typeName === 'ZodBoolean') {
          type = 'boolean';
        } else if (fieldDef.typeName === 'ZodArray') {
          type = 'array';
        } else if (fieldDef.typeName === 'ZodObject') {
          type = 'object';
        } else if (fieldDef.typeName === 'ZodEnum') {
          type = 'string';
          enumValues = fieldDef.values;
        }
        
        // Get description from metadata
        if ((value as any).description) {
          description = (value as any).description;
        }
        
        // Create property definition
        properties[key] = {
          type,
          description,
        };
        
        // Add enum values if available
        if (enumValues) {
          properties[key].enum = enumValues;
        }
      }
      
      return { properties, required };
    } catch (error) {
      console.warn('Error generating schema description:', error);
      return { properties: {}, required: [] };
    }
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
        throw createError(
          ErrorCode.InvalidParams,
          `Invalid operation: ${operation}`,
          {
            category: ErrorCategory.Validation,
            source: this.name,
            operation: 'execute',
            details: {
              availableOperations: Object.keys(this.operations),
              troubleshooting: `Available operations: ${Object.keys(this.operations).join(', ')}`
            }
          }
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Invalid parameters: ${error.message}`,
                details: error.errors.map(err => ({
                  path: err.path.join('.'),
                  message: err.message,
                  code: err.code
                }))
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
      
      if (error instanceof McpError) {
        throw error;
      }
      
      throw handleApiError(error, this.name, `execute_${args && typeof args === 'object' && 'operation' in args ? (args as any).operation : 'unknown'}`);
    }
  }

  /**
   * Register an operation
   * @param operation Operation name
   * @param handler Operation handler
   * @param schema Schema for operation parameters
   * @param description Operation description
   */
  protected registerOperation(
    operation: string,
    handler: (params: any) => Promise<any>,
    schema?: z.ZodType<any>,
    description?: string
  ): void {
    this.operations[operation] = handler;
    if (schema) {
      this.schemas[operation] = schema;
    } else {
      // Default to empty object schema if none provided
      this.schemas[operation] = z.object({}).passthrough();
    }
    
    // Store operation description for better tool documentation
    if (description) {
      if (!this.operationDescriptions) {
        this.operationDescriptions = {};
      }
      this.operationDescriptions[operation] = description;
    }
  }
  
  /**
   * Operation descriptions for better tool documentation
   */
  protected operationDescriptions?: Record<string, string>;
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
        
        // Register operations with enhanced descriptions
        this.registerOperation(
          'list', 
          this.listProjects.bind(this), 
          z.object({
            continuationToken: z.string().optional().describe('Token for pagination'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 25, max: 100)'),
          }).strict(),
          'List all projects in the organization with pagination support'
        );
        
        this.registerOperation(
          'get', 
          this.getProject.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            includeCapabilities: z.boolean().optional().describe('Include capabilities in the response'),
          }).strict(),
          'Get detailed information about a specific project'
        );
      }
      
      /**
       * Generate examples for the projects tool
       * @returns Array of example strings
       */
      protected generateExamples(): string[] {
        return [
          '```json\n{\n  "operation": "list",\n  "listParams": {\n    "maxResults": 10\n  }\n}\n```\nList up to 10 projects in the organization',
          '```json\n{\n  "operation": "get",\n  "getParams": {\n    "projectId": "MyProject",\n    "includeCapabilities": true\n  }\n}\n```\nGet detailed information about a project named "MyProject" including its capabilities'
        ];
      }
      
      async listProjects(params: PaginationParams): Promise<any> {
        try {
          // Normalize pagination parameters
          const { maxResults, continuationToken } = normalizePaginationParams(params);
          
          const coreApi = await this.apiClient.getCoreApi();
          const projects = await coreApi.getProjects();
          
          // Apply pagination
          const startIndex = continuationToken ? parseInt(continuationToken, 10) : 0;
          const endIndex = Math.min(startIndex + maxResults, projects.length);
          const pagedProjects = projects.slice(startIndex, endIndex);
          
          // Create continuation token if there are more results
          const nextContinuationToken = endIndex < projects.length 
            ? endIndex.toString() 
            : undefined;
          
          return {
            count: projects.length,
            projects: pagedProjects.map((project: any) => ({
              id: project.id,
              name: project.name,
              description: project.description,
              state: project.state,
              visibility: project.visibility,
              lastUpdateTime: project.lastUpdateTime,
              url: project.url,
            })),
            continuationToken: nextContinuationToken,
            hasMore: !!nextContinuationToken,
          };
        } catch (error) {
          throw handleApiError(error, 'ProjectsTool', 'listProjects');
        }
      }
      
      async getProject(params: { projectId: string, includeCapabilities?: boolean }): Promise<any> {
        try {
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
        } catch (error) {
          throw handleApiError(error, 'ProjectsTool', 'getProject');
        }
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
        super(apiClient, 'repositories', 'Manage Git repositories in Azure DevOps');
        
        // Register operations with enhanced descriptions
        this.registerOperation(
          'list', 
          this.listRepositories.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            continuationToken: z.string().optional().describe('Token for pagination'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 25, max: 100)'),
          }).strict(),
          'List all Git repositories in a project with pagination support'
        );
        
        this.registerOperation(
          'get', 
          this.getRepository.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            repositoryId: z.string().describe('Repository ID or name'),
          }).strict(),
          'Get detailed information about a specific Git repository'
        );
        
        this.registerOperation(
          'listBranches', 
          this.listBranches.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            repositoryId: z.string().describe('Repository ID or name'),
            continuationToken: z.string().optional().describe('Token for pagination'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 25, max: 100)'),
          }).strict(),
          'List all branches in a Git repository with pagination support'
        );
      }
      
      /**
       * Generate examples for the repositories tool
       * @returns Array of example strings
       */
      protected generateExamples(): string[] {
        return [
          '```json\n{\n  "operation": "list",\n  "listParams": {\n    "projectId": "MyProject",\n    "maxResults": 10\n  }\n}\n```\nList up to 10 repositories in the project "MyProject"',
          '```json\n{\n  "operation": "get",\n  "getParams": {\n    "projectId": "MyProject",\n    "repositoryId": "MyRepo"\n  }\n}\n```\nGet detailed information about a repository named "MyRepo" in project "MyProject"',
          '```json\n{\n  "operation": "listBranches",\n  "listBranchesParams": {\n    "projectId": "MyProject",\n    "repositoryId": "MyRepo"\n  }\n}\n```\nList all branches in repository "MyRepo" in project "MyProject"'
        ];
      }
      
      async listRepositories(params: { projectId: string } & PaginationParams): Promise<any> {
        try {
          // Normalize pagination parameters
          const { maxResults, continuationToken } = normalizePaginationParams(params);
          
          const gitApi = await this.apiClient.getGitApi();
          const repositories = await gitApi.getRepositories(params.projectId);
          
          // Apply pagination
          const startIndex = continuationToken ? parseInt(continuationToken, 10) : 0;
          const endIndex = Math.min(startIndex + maxResults, repositories.length);
          const pagedRepositories = repositories.slice(startIndex, endIndex);
          
          // Create continuation token if there are more results
          const nextContinuationToken = endIndex < repositories.length 
            ? endIndex.toString() 
            : undefined;
          
          return {
            count: repositories.length,
            repositories: pagedRepositories.map((repo: any) => ({
              id: repo.id,
              name: repo.name,
              url: repo.url,
              defaultBranch: repo.defaultBranch,
              size: repo.size,
              remoteUrl: repo.remoteUrl,
              webUrl: repo.webUrl,
            })),
            continuationToken: nextContinuationToken,
            hasMore: !!nextContinuationToken,
          };
        } catch (error) {
          throw handleApiError(error, 'RepositoriesTool', 'listRepositories');
        }
      }
      
      async getRepository(params: { projectId: string, repositoryId: string }): Promise<any> {
        try {
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
        } catch (error) {
          throw handleApiError(error, 'RepositoriesTool', 'getRepository');
        }
      }
      
      async listBranches(params: { projectId: string, repositoryId: string } & PaginationParams): Promise<any> {
        try {
          // Normalize pagination parameters
          const { maxResults, continuationToken } = normalizePaginationParams(params);
          
          const gitApi = await this.apiClient.getGitApi();
          const refs = await gitApi.getRefs(params.repositoryId, params.projectId, "heads/", false, false);
          
          // Extract branch names from refs
          const branches = refs.map((ref: any) => ({
            name: ref.name.replace('refs/heads/', ''),
            objectId: ref.objectId,
            creator: ref.creator?.displayName,
            url: ref.url,
          }));
          
          // Apply pagination
          const startIndex = continuationToken ? parseInt(continuationToken, 10) : 0;
          const endIndex = Math.min(startIndex + maxResults, branches.length);
          const pagedBranches = branches.slice(startIndex, endIndex);
          
          // Create continuation token if there are more results
          const nextContinuationToken = endIndex < branches.length 
            ? endIndex.toString() 
            : undefined;
          
          return {
            count: branches.length,
            branches: pagedBranches,
            continuationToken: nextContinuationToken,
            hasMore: !!nextContinuationToken,
          };
        } catch (error) {
          throw handleApiError(error, 'RepositoriesTool', 'listBranches');
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
        super(apiClient, 'workItems', 'Manage work items in Azure DevOps');
        
        // Register operations with enhanced descriptions
        this.registerOperation(
          'get', 
          this.getWorkItem.bind(this), 
          z.object({
            id: z.number().describe('Work item ID'),
            expand: z.enum(['None', 'Relations', 'Fields', 'Links', 'All']).optional().describe('Expand options'),
          }).strict(),
          'Get detailed information about a specific work item'
        );
        
        this.registerOperation(
          'create', 
          this.createWorkItem.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            type: z.string().describe('Work item type (e.g., Bug, Task, User Story)'),
            title: z.string().describe('Work item title'),
            description: z.string().optional().describe('Work item description'),
            assignedTo: z.string().optional().describe('User to assign the work item to'),
          }).strict(),
          'Create a new work item in a project'
        );
      }
      
      /**
       * Generate examples for the work items tool
       * @returns Array of example strings
       */
      protected generateExamples(): string[] {
        return [
          '```json\n{\n  "operation": "get",\n  "getParams": {\n    "id": 42,\n    "expand": "Relations"\n  }\n}\n```\nGet detailed information about work item #42 including its relations',
          '```json\n{\n  "operation": "create",\n  "createParams": {\n    "projectId": "MyProject",\n    "type": "Task",\n    "title": "Implement feature X",\n    "description": "This task involves implementing feature X",\n    "assignedTo": "user@example.com"\n  }\n}\n```\nCreate a new task in project "MyProject" assigned to user@example.com'
        ];
      }
      
      async getWorkItem(params: { id: number, expand?: string }): Promise<any> {
        try {
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
        } catch (error) {
          throw handleApiError(error, 'WorkItemsTool', 'getWorkItem');
        }
      }
      
      async createWorkItem(params: { 
        projectId: string, 
        type: string, 
        title: string, 
        description?: string, 
        assignedTo?: string 
      }): Promise<any> {
        try {
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
        } catch (error) {
          throw handleApiError(error, 'WorkItemsTool', 'createWorkItem');
        }
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
        super(apiClient, 'pullRequests', 'Manage pull requests in Azure DevOps repositories');
        
        // Register operations with enhanced descriptions
        this.registerOperation(
          'list', 
          this.listPullRequests.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            repositoryId: z.string().describe('Repository ID or name'),
            status: z.enum(['Active', 'Abandoned', 'Completed', 'All']).optional().describe('Pull request status'),
            continuationToken: z.string().optional().describe('Token for pagination'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 25, max: 100)'),
          }).strict(),
          'List pull requests in a repository with filtering and pagination support'
        );
        
        this.registerOperation(
          'get', 
          this.getPullRequest.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            repositoryId: z.string().describe('Repository ID or name'),
            pullRequestId: z.number().describe('Pull request ID'),
          }).strict(),
          'Get detailed information about a specific pull request'
        );
      }
      
      /**
       * Generate examples for the pull requests tool
       * @returns Array of example strings
       */
      protected generateExamples(): string[] {
        return [
          '```json\n{\n  "operation": "list",\n  "listParams": {\n    "projectId": "MyProject",\n    "repositoryId": "MyRepo",\n    "status": "Active"\n  }\n}\n```\nList active pull requests in repository "MyRepo" in project "MyProject"',
          '```json\n{\n  "operation": "get",\n  "getParams": {\n    "projectId": "MyProject",\n    "repositoryId": "MyRepo",\n    "pullRequestId": 42\n  }\n}\n```\nGet detailed information about pull request #42 in repository "MyRepo" in project "MyProject"'
        ];
      }
      
      async listPullRequests(params: { 
        projectId: string, 
        repositoryId: string, 
        status?: string 
      } & PaginationParams): Promise<any> {
        try {
          // Normalize pagination parameters
          const { maxResults, continuationToken } = normalizePaginationParams(params);
          
          const gitApi = await this.apiClient.getGitApi();
          const pullRequests = await gitApi.getPullRequests(
            params.repositoryId, 
            { 
              status: params.status as any,
              repositoryId: params.repositoryId,
            }
          );
          
          // Apply pagination
          const startIndex = continuationToken ? parseInt(continuationToken, 10) : 0;
          const endIndex = Math.min(startIndex + maxResults, pullRequests.length);
          const pagedPullRequests = pullRequests.slice(startIndex, endIndex);
          
          // Create continuation token if there are more results
          const nextContinuationToken = endIndex < pullRequests.length 
            ? endIndex.toString() 
            : undefined;
          
          return {
            count: pullRequests.length,
            pullRequests: pagedPullRequests.map((pr: any) => ({
              pullRequestId: pr.pullRequestId,
              title: pr.title,
              status: pr.status,
              createdBy: pr.createdBy?.displayName,
              creationDate: pr.creationDate,
              sourceRefName: pr.sourceRefName,
              targetRefName: pr.targetRefName,
              url: pr.url,
            })),
            continuationToken: nextContinuationToken,
            hasMore: !!nextContinuationToken,
          };
        } catch (error) {
          throw handleApiError(error, 'PullRequestsTool', 'listPullRequests');
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
          throw handleApiError(error, 'PullRequestsTool', 'getPullRequest');
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
        super(apiClient, 'pipelines', 'Manage CI/CD pipelines in Azure DevOps');
        
        // Register operations with enhanced descriptions
        this.registerOperation(
          'list', 
          this.listPipelines.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            continuationToken: z.string().optional().describe('Token for pagination'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 25, max: 100)'),
          }).strict(),
          'List all pipelines in a project with pagination support'
        );
        
        this.registerOperation(
          'get', 
          this.getPipeline.bind(this), 
          z.object({
            projectId: z.string().describe('Project ID or name'),
            pipelineId: z.number().describe('Pipeline ID'),
          }).strict(),
          'Get detailed information about a specific pipeline'
        );
      }
      
      /**
       * Generate examples for the pipelines tool
       * @returns Array of example strings
       */
      protected generateExamples(): string[] {
        return [
          '```json\n{\n  "operation": "list",\n  "listParams": {\n    "projectId": "MyProject",\n    "maxResults": 10\n  }\n}\n```\nList up to 10 pipelines in project "MyProject"',
          '```json\n{\n  "operation": "get",\n  "getParams": {\n    "projectId": "MyProject",\n    "pipelineId": 42\n  }\n}\n```\nGet detailed information about pipeline #42 in project "MyProject"'
        ];
      }
      
      async listPipelines(params: { projectId: string } & PaginationParams): Promise<any> {
        try {
          // Normalize pagination parameters
          const { maxResults, continuationToken } = normalizePaginationParams(params);
          
          const pipelineApi = await this.apiClient.getPipelineApi();
          const pipelines = await pipelineApi.listPipelines(params.projectId);
          
          // Apply pagination
          const startIndex = continuationToken ? parseInt(continuationToken, 10) : 0;
          const endIndex = Math.min(startIndex + maxResults, pipelines.length);
          const pagedPipelines = pipelines.slice(startIndex, endIndex);
          
          // Create continuation token if there are more results
          const nextContinuationToken = endIndex < pipelines.length 
            ? endIndex.toString() 
            : undefined;
          
          return {
            count: pipelines.length,
            pipelines: pagedPipelines.map((pipeline: any) => ({
              id: pipeline.id,
              name: pipeline.name,
              folder: pipeline.folder,
              revision: pipeline.revision,
              url: pipeline.url,
            })),
            continuationToken: nextContinuationToken,
            hasMore: !!nextContinuationToken,
          };
        } catch (error) {
          throw handleApiError(error, 'PipelinesTool', 'listPipelines');
        }
      }
      
      async getPipeline(params: { projectId: string, pipelineId: number }): Promise<any> {
        try {
          const pipelineApi = await this.apiClient.getPipelineApi();
          const pipeline = await pipelineApi.getPipeline(params.projectId, params.pipelineId);
          
          return {
            id: pipeline.id,
            name: pipeline.name,
            folder: pipeline.folder,
            revision: pipeline.revision,
            url: pipeline.url,
          };
        } catch (error) {
          throw handleApiError(error, 'PipelinesTool', 'getPipeline');
        }
      }
    }
    
    return new PipelinesTool(apiClient);
  }
}
