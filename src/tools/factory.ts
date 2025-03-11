import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ADOApiClient } from '../api/client/index.js';
import { ToolDefinition, Tool, ToolConstructor } from './registry.js';

/**
 * Tool factory for generating tools based on Azure DevOps API methods
 */
export class ToolFactory {
  /**
   * Create a tool class for a specific API method
   * @param apiName Name of the API (e.g., 'core', 'git', 'build')
   * @param methodName Name of the API method (e.g., 'getProjects', 'getRepositories')
   * @param description Tool description
   * @param inputSchema Zod schema for input validation
   * @param responseTransformer Function to transform API response to tool result
   * @returns Tool constructor
   */
  static createApiMethodTool(
    apiName: string,
    methodName: string,
    description: string,
    inputSchema: z.ZodType<any>,
    responseTransformer: (response: any) => any
  ): ToolConstructor {
    // Generate tool name based on API and method
    const toolName = `${apiName}_${methodName}`;

    // Create tool class
    class GeneratedTool implements Tool {
      private apiClient: ADOApiClient;

      constructor(apiClient: ADOApiClient) {
        this.apiClient = apiClient;
      }

      static getDefinition(): ToolDefinition {
        return {
          name: toolName,
          description: description,
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        };
      }

      async execute(args: unknown): Promise<any> {
        try {
          // Validate arguments
          const params = inputSchema.parse(args);

          // Get API client based on apiName
          const api = await this.getApiClient(apiName);

          // Call API method with parameters
          const response = await this.callApiMethod(api, methodName, params);

          // Transform response
          const transformedResponse = responseTransformer(response);

          // Format result
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(transformedResponse, null, 2),
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
            `Failed to execute ${toolName}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      private async getApiClient(apiName: string): Promise<any> {
        const apiMethodMap: Record<string, string> = {
          core: 'getCoreApi',
          git: 'getGitApi',
          build: 'getBuildApi',
          workItem: 'getWorkItemTrackingApi',
          release: 'getReleaseApi',
          task: 'getTaskApi',
          pipeline: 'getPipelinesApi',
        };

        const apiMethod = apiMethodMap[apiName];
        if (!apiMethod) {
          throw new McpError(
            ErrorCode.InternalError,
            `Unknown API: ${apiName}`
          );
        }

        return await (this.apiClient as any)[apiMethod]();
      }

      private async callApiMethod(api: any, methodName: string, params: any): Promise<any> {
        if (typeof api[methodName] !== 'function') {
          throw new McpError(
            ErrorCode.InternalError,
            `Method ${methodName} not found on ${apiName} API`
          );
        }

        // Convert params object to arguments array based on parameter names
        const args = this.paramsToArgs(params);
        
        return await api[methodName](...args);
      }

      private paramsToArgs(params: Record<string, any>): any[] {
        // This is a simplified implementation
        // In a real implementation, we would need to map parameter names to positions
        return Object.values(params);
      }
    }

    return GeneratedTool;
  }

  /**
   * Create a tool class for a specific entity operation
   * @param entityName Name of the entity (e.g., 'project', 'repository', 'workItem')
   * @param operation Operation type (e.g., 'list', 'get', 'create', 'update')
   * @param description Tool description
   * @param inputSchema Zod schema for input validation
   * @param apiMethod API method to call
   * @param responseTransformer Function to transform API response to tool result
   * @returns Tool constructor
   */
  static createEntityOperationTool(
    entityName: string,
    operation: 'list' | 'get' | 'create' | 'update' | 'delete',
    description: string,
    inputSchema: z.ZodType<any>,
    apiMethod: { apiName: string; methodName: string },
    responseTransformer: (response: any) => any
  ): ToolConstructor {
    // Generate tool name based on operation and entity
    const toolName = `${operation}_${entityName}${operation === 'list' ? 's' : ''}`;

    // Create tool class using the API method tool factory
    return ToolFactory.createApiMethodTool(
      apiMethod.apiName,
      apiMethod.methodName,
      description,
      inputSchema,
      responseTransformer
    );
  }
}
