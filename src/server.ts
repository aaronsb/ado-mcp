import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';

// This will be implemented later
interface ADOServiceConfig {
  organization: string;
  project?: string;
  credentials: {
    pat: string;
  };
  api?: {
    baseUrl?: string;
    version?: string;
    retry?: {
      maxRetries?: number;
      delayMs?: number;
      backoffFactor?: number;
    };
  };
}

// This will be implemented later
class ADOService {
  constructor(config: ADOServiceConfig) {
    // Implementation will be added later
  }
}

function loadConfig(): ADOServiceConfig {
  // Try environment variables first
  if (process.env.ADO_ORGANIZATION && process.env.ADO_PAT) {
    return {
      organization: process.env.ADO_ORGANIZATION,
      project: process.env.ADO_PROJECT,
      credentials: {
        pat: process.env.ADO_PAT
      }
    };
  }

  // Fall back to config file
  const configPath = path.join(process.cwd(), 'config', 'azuredevops.json');
  if (!fs.existsSync(configPath)) {
    console.error('No configuration found. Please set environment variables (ADO_ORGANIZATION, ADO_PROJECT, ADO_PAT) or create config/azuredevops.json');
    throw new McpError(
      ErrorCode.InternalError,
      'No configuration found. Please set environment variables (ADO_ORGANIZATION, ADO_PROJECT, ADO_PAT) or create config/azuredevops.json'
    );
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(`Error parsing config file: ${error instanceof Error ? error.message : String(error)}`);
    throw new McpError(
      ErrorCode.InternalError,
      `Error parsing config file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export class AzureDevOpsServer {
  private server: Server;
  private service: ADOService;

  constructor() {
    // Initialize service
    const config = loadConfig();
    this.service = new ADOService(config);

    // Initialize server
    this.server = new Server(
      {
        name: 'azure-devops-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            // Project tools
            list_projects: true,
            get_project: true,
            
            // Work item tools
            list_work_items: true,
            get_work_item: true,
            create_work_item: true,
            update_work_item: true,
            
            // Repository tools
            list_repositories: true,
            get_repository: true,
            
            // Pull request tools
            list_pull_requests: true,
            get_pull_request: true,
            create_pull_request: true,
            
            // Branch tools
            list_branches: true,
            create_branch: true,
            
            // Pipeline tools
            list_pipelines: true,
            get_pipeline: true,
            run_pipeline: true,
          },
        },
      }
    );

    this.setupHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Project tools
        {
          name: 'list_projects',
          description: 'List Azure DevOps projects',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'get_project',
          description: 'Get details of a specific Azure DevOps project',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
            },
            required: ['project'],
            additionalProperties: false,
          },
        },
        
        // Work item tools
        {
          name: 'list_work_items',
          description: 'List work items with filtering',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              query: {
                type: 'string',
                description: 'WIQL query string',
              },
              type: {
                type: 'string',
                description: 'Work item type (e.g., Bug, Task, User Story)',
              },
              state: {
                type: 'string',
                description: 'Work item state (e.g., Active, Closed)',
              },
              top: {
                type: 'number',
                description: 'Maximum number of work items to return',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'get_work_item',
          description: 'Get details of a specific work item',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Work item ID',
              },
              expand: {
                type: 'string',
                description: 'Expand options (e.g., relations, fields)',
              },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
        {
          name: 'create_work_item',
          description: 'Create a new work item',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              type: {
                type: 'string',
                description: 'Work item type (e.g., Bug, Task, User Story)',
              },
              title: {
                type: 'string',
                description: 'Work item title',
              },
              description: {
                type: 'string',
                description: 'Work item description',
              },
              fields: {
                type: 'object',
                description: 'Additional fields to set',
              },
            },
            required: ['project', 'type', 'title'],
            additionalProperties: false,
          },
        },
        {
          name: 'update_work_item',
          description: 'Update an existing work item',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Work item ID',
              },
              title: {
                type: 'string',
                description: 'Work item title',
              },
              description: {
                type: 'string',
                description: 'Work item description',
              },
              state: {
                type: 'string',
                description: 'Work item state',
              },
              fields: {
                type: 'object',
                description: 'Additional fields to update',
              },
            },
            required: ['id'],
            additionalProperties: false,
          },
        },
        
        // Repository tools
        {
          name: 'list_repositories',
          description: 'List Git repositories',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'get_repository',
          description: 'Get details of a specific repository',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              repository: {
                type: 'string',
                description: 'Repository name or ID',
              },
            },
            required: ['repository'],
            additionalProperties: false,
          },
        },
        
        // Pull request tools
        {
          name: 'list_pull_requests',
          description: 'List pull requests',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name or ID',
              },
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              status: {
                type: 'string',
                description: 'Pull request status (e.g., active, completed, abandoned)',
                enum: ['active', 'completed', 'abandoned', 'all'],
              },
              creator: {
                type: 'string',
                description: 'Creator\'s email or ID',
              },
              reviewer: {
                type: 'string',
                description: 'Reviewer\'s email or ID',
              },
              top: {
                type: 'number',
                description: 'Maximum number of pull requests to return',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'get_pull_request',
          description: 'Get details of a specific pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name or ID',
              },
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              pullRequestId: {
                type: 'number',
                description: 'Pull request ID',
              },
            },
            required: ['pullRequestId'],
            additionalProperties: false,
          },
        },
        {
          name: 'create_pull_request',
          description: 'Create a new pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name or ID',
              },
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              sourceRefName: {
                type: 'string',
                description: 'Source branch name (e.g., refs/heads/feature/my-feature)',
              },
              targetRefName: {
                type: 'string',
                description: 'Target branch name (e.g., refs/heads/main)',
              },
              title: {
                type: 'string',
                description: 'Pull request title',
              },
              description: {
                type: 'string',
                description: 'Pull request description',
              },
              reviewers: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'List of reviewer emails or IDs',
              },
            },
            required: ['repository', 'sourceRefName', 'targetRefName', 'title'],
            additionalProperties: false,
          },
        },
        
        // Branch tools
        {
          name: 'list_branches',
          description: 'List branches in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name or ID',
              },
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              filter: {
                type: 'string',
                description: 'Filter to apply to branch names',
              },
            },
            required: ['repository'],
            additionalProperties: false,
          },
        },
        {
          name: 'create_branch',
          description: 'Create a new branch',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name or ID',
              },
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              name: {
                type: 'string',
                description: 'New branch name',
              },
              baseBranch: {
                type: 'string',
                description: 'Base branch name to create from',
              },
            },
            required: ['repository', 'name', 'baseBranch'],
            additionalProperties: false,
          },
        },
        
        // Pipeline tools
        {
          name: 'list_pipelines',
          description: 'List pipelines',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              folder: {
                type: 'string',
                description: 'Folder path',
              },
              name: {
                type: 'string',
                description: 'Pipeline name filter',
              },
              top: {
                type: 'number',
                description: 'Maximum number of pipelines to return',
              },
            },
            required: ['project'],
            additionalProperties: false,
          },
        },
        {
          name: 'get_pipeline',
          description: 'Get details of a specific pipeline',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              pipelineId: {
                type: 'number',
                description: 'Pipeline ID',
              },
            },
            required: ['project', 'pipelineId'],
            additionalProperties: false,
          },
        },
        {
          name: 'run_pipeline',
          description: 'Trigger a pipeline run',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Project name or ID',
              },
              pipelineId: {
                type: 'number',
                description: 'Pipeline ID',
              },
              branch: {
                type: 'string',
                description: 'Branch to run the pipeline on',
              },
              variables: {
                type: 'object',
                description: 'Pipeline variables',
              },
            },
            required: ['project', 'pipelineId'],
            additionalProperties: false,
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // This is a placeholder for the actual tool implementations
        // In a real implementation, we would call the appropriate tool based on the request.params.name
        
        return {
          content: [
            {
              type: 'text',
              text: `Azure DevOps API tool '${request.params.name}' is not yet implemented. This is a placeholder for the actual implementation.`,
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Azure DevOps API error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    const timestamp = new Date().toISOString();
    console.error(`Azure DevOps MCP server running on stdio (started at ${timestamp})`);
  }
}
