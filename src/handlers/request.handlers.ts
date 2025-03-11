import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ADOApiClient } from '../api/client/index.js';
import { ToolRegistry } from '../tools/registry.js';

/**
 * Register request handlers for the server
 * @param server MCP server
 * @param apiClient API client
 */
export function registerRequestHandlers(server: Server, apiClient: ADOApiClient): void {
  // Create tool registry
  const toolRegistry = new ToolRegistry(apiClient);
  
  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolDefinitions = toolRegistry.getAllToolDefinitions();
    
    return {
      tools: toolDefinitions,
    };
  });
  
  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      return await toolRegistry.executeTool(name, args);
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute tool ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}
