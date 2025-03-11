import { z } from 'zod';
import { ToolFactory } from './factory.js';
import { ToolConstructor } from './registry.js';

/**
 * Tool generator for Azure DevOps API
 * Automatically generates tools based on API capabilities
 */
export class ToolGenerator {
  /**
   * Generate tools for projects
   * @returns Array of tool constructors
   */
  static generateProjectTools(): ToolConstructor[] {
    const tools: ToolConstructor[] = [];

    // List projects tool
    const listProjectsSchema = z.object({}).strict();
    const listProjectsTool = ToolFactory.createApiMethodTool(
      'core',
      'getProjects',
      'List Azure DevOps projects',
      listProjectsSchema,
      (response) => ({
        count: response.length,
        projects: response.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          state: project.state,
          visibility: project.visibility,
          lastUpdateTime: project.lastUpdateTime,
          url: project.url,
        })),
      })
    );
    tools.push(listProjectsTool);

    // Get project tool
    const getProjectSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      includeCapabilities: z.boolean().optional().describe('Include capabilities in the response'),
    }).strict();
    const getProjectTool = ToolFactory.createApiMethodTool(
      'core',
      'getProject',
      'Get details of an Azure DevOps project',
      getProjectSchema,
      (response) => ({
        id: response.id,
        name: response.name,
        description: response.description,
        state: response.state,
        visibility: response.visibility,
        lastUpdateTime: response.lastUpdateTime,
        url: response.url,
        capabilities: response.capabilities,
      })
    );
    tools.push(getProjectTool);

    return tools;
  }

  /**
   * Generate tools for repositories
   * @returns Array of tool constructors
   */
  static generateRepositoryTools(): ToolConstructor[] {
    const tools: ToolConstructor[] = [];

    // List repositories tool
    const listRepositoriesSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
    }).strict();
    const listRepositoriesTool = ToolFactory.createApiMethodTool(
      'git',
      'getRepositories',
      'List Git repositories in a project',
      listRepositoriesSchema,
      (response) => ({
        count: response.length,
        repositories: response.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.url,
          defaultBranch: repo.defaultBranch,
          size: repo.size,
          remoteUrl: repo.remoteUrl,
          webUrl: repo.webUrl,
        })),
      })
    );
    tools.push(listRepositoriesTool);

    // Get repository tool
    const getRepositorySchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      repositoryId: z.string().describe('Repository ID or name'),
    }).strict();
    const getRepositoryTool = ToolFactory.createApiMethodTool(
      'git',
      'getRepository',
      'Get details of a Git repository',
      getRepositorySchema,
      (response) => ({
        id: response.id,
        name: response.name,
        url: response.url,
        defaultBranch: response.defaultBranch,
        size: response.size,
        remoteUrl: response.remoteUrl,
        webUrl: response.webUrl,
        project: {
          id: response.project?.id,
          name: response.project?.name,
        },
      })
    );
    tools.push(getRepositoryTool);

    return tools;
  }

  /**
   * Generate tools for work items
   * @returns Array of tool constructors
   */
  static generateWorkItemTools(): ToolConstructor[] {
    const tools: ToolConstructor[] = [];

    // Get work item tool
    const getWorkItemSchema = z.object({
      id: z.number().describe('Work item ID'),
      expand: z.enum(['None', 'Relations', 'Fields', 'Links', 'All']).optional().describe('Expand options'),
    }).strict();
    const getWorkItemTool = ToolFactory.createApiMethodTool(
      'workItem',
      'getWorkItem',
      'Get details of a work item',
      getWorkItemSchema,
      (response) => ({
        id: response.id,
        rev: response.rev,
        fields: response.fields,
        relations: response.relations,
        url: response.url,
      })
    );
    tools.push(getWorkItemTool);

    // Create work item tool
    const createWorkItemSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      type: z.string().describe('Work item type (e.g., Bug, Task, User Story)'),
      title: z.string().describe('Work item title'),
      description: z.string().optional().describe('Work item description'),
      assignedTo: z.string().optional().describe('User to assign the work item to'),
    }).strict();
    const createWorkItemTool = ToolFactory.createApiMethodTool(
      'workItem',
      'createWorkItem',
      'Create a new work item',
      createWorkItemSchema,
      (response) => ({
        id: response.id,
        rev: response.rev,
        fields: response.fields,
        url: response.url,
      })
    );
    tools.push(createWorkItemTool);

    return tools;
  }

  /**
   * Generate tools for pull requests
   * @returns Array of tool constructors
   */
  static generatePullRequestTools(): ToolConstructor[] {
    const tools: ToolConstructor[] = [];

    // List pull requests tool
    const listPullRequestsSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      repositoryId: z.string().describe('Repository ID or name'),
      status: z.enum(['Active', 'Abandoned', 'Completed', 'All']).optional().describe('Pull request status'),
    }).strict();
    const listPullRequestsTool = ToolFactory.createApiMethodTool(
      'git',
      'getPullRequests',
      'List pull requests in a repository',
      listPullRequestsSchema,
      (response) => ({
        count: response.length,
        pullRequests: response.map((pr: any) => ({
          pullRequestId: pr.pullRequestId,
          title: pr.title,
          status: pr.status,
          createdBy: pr.createdBy?.displayName,
          creationDate: pr.creationDate,
          sourceRefName: pr.sourceRefName,
          targetRefName: pr.targetRefName,
          url: pr.url,
        })),
      })
    );
    tools.push(listPullRequestsTool);

    // Get pull request tool
    const getPullRequestSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      repositoryId: z.string().describe('Repository ID or name'),
      pullRequestId: z.number().describe('Pull request ID'),
    }).strict();
    const getPullRequestTool = ToolFactory.createApiMethodTool(
      'git',
      'getPullRequestById',
      'Get details of a pull request',
      getPullRequestSchema,
      (response) => ({
        pullRequestId: response.pullRequestId,
        title: response.title,
        description: response.description,
        status: response.status,
        createdBy: response.createdBy?.displayName,
        creationDate: response.creationDate,
        sourceRefName: response.sourceRefName,
        targetRefName: response.targetRefName,
        mergeStatus: response.mergeStatus,
        isDraft: response.isDraft,
        url: response.url,
      })
    );
    tools.push(getPullRequestTool);

    return tools;
  }

  /**
   * Generate tools for branches
   * @returns Array of tool constructors
   */
  static generateBranchTools(): ToolConstructor[] {
    const tools: ToolConstructor[] = [];

    // List branches tool
    const listBranchesSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      repositoryId: z.string().describe('Repository ID or name'),
    }).strict();
    const listBranchesTool = ToolFactory.createApiMethodTool(
      'git',
      'getBranches',
      'List branches in a repository',
      listBranchesSchema,
      (response) => ({
        count: response.length,
        branches: response.map((branch: any) => ({
          name: branch.name,
          objectId: branch.objectId,
          creator: branch.creator?.displayName,
          isBaseVersion: branch.isBaseVersion,
          url: branch.url,
        })),
      })
    );
    tools.push(listBranchesTool);

    return tools;
  }

  /**
   * Generate tools for pipelines
   * @returns Array of tool constructors
   */
  static generatePipelineTools(): ToolConstructor[] {
    const tools: ToolConstructor[] = [];

    // List pipelines tool
    const listPipelinesSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
    }).strict();
    const listPipelinesTool = ToolFactory.createApiMethodTool(
      'pipeline',
      'listPipelines',
      'List pipelines in a project',
      listPipelinesSchema,
      (response) => ({
        count: response.count,
        pipelines: response.value.map((pipeline: any) => ({
          id: pipeline.id,
          name: pipeline.name,
          folder: pipeline.folder,
          revision: pipeline.revision,
          url: pipeline.url,
        })),
      })
    );
    tools.push(listPipelinesTool);

    // Get pipeline tool
    const getPipelineSchema = z.object({
      projectId: z.string().describe('Project ID or name'),
      pipelineId: z.number().describe('Pipeline ID'),
    }).strict();
    const getPipelineTool = ToolFactory.createApiMethodTool(
      'pipeline',
      'getPipeline',
      'Get details of a pipeline',
      getPipelineSchema,
      (response) => ({
        id: response.id,
        name: response.name,
        folder: response.folder,
        revision: response.revision,
        url: response.url,
      })
    );
    tools.push(getPipelineTool);

    return tools;
  }

  /**
   * Generate all tools
   * @returns Array of tool constructors
   */
  static generateAllTools(): ToolConstructor[] {
    return [
      ...this.generateProjectTools(),
      ...this.generateRepositoryTools(),
      ...this.generateWorkItemTools(),
      ...this.generatePullRequestTools(),
      ...this.generateBranchTools(),
      ...this.generatePipelineTools(),
    ];
  }
}
