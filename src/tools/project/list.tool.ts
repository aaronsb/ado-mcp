import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ADOApiClient } from '../../api/client/api.client.js';
import { Project, ProjectData } from '../../entities/project/project.entity.js';

/**
 * Input schema for list_projects tool
 */
export const ListProjectsSchema = z.object({
  // No required parameters
}).strict();

/**
 * Tool for listing Azure DevOps projects
 */
export class ListProjectsTool {
  private apiClient: ADOApiClient;

  /**
   * Create a new ListProjectsTool instance
   * @param apiClient API client
   */
  constructor(apiClient: ADOApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get the tool definition
   * @returns Tool definition
   */
  static getDefinition() {
    return {
      name: 'list_projects',
      description: 'List Azure DevOps projects',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    };
  }

  /**
   * Execute the tool
   * @param args Tool arguments
   * @returns Tool result
   */
  async execute(args: unknown) {
    try {
      // Validate arguments
      const params = ListProjectsSchema.parse(args);

      // Get Core API client
      const coreApi = await this.apiClient.getCoreApi();
      
      // Call API to get projects
      const projects = await coreApi.getProjects();
      
      // Transform response
      const projectEntities = projects.map(project => new Project(project as unknown as ProjectData));
      
      // Format result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: projectEntities.length,
                projects: projectEntities.map(project => ({
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  state: project.state,
                  visibility: project.visibility,
                  lastUpdateTime: project.lastUpdateTime.toISOString(),
                  url: project.url,
                })),
              },
              null,
              2
            ),
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
        `Failed to list projects: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
