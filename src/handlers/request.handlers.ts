import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ToolRegistry } from '../tools/index.js';

/**
 * Request handlers for Azure DevOps MCP server
 * Manages MCP protocol request handling and routing
 */
export class RequestHandlers {
  private server: Server;
  private toolRegistry: ToolRegistry;

  /**
   * Create a new request handlers instance
   * @param server MCP server instance
   * @param toolRegistry Tool registry
   */
  constructor(server: Server, toolRegistry: ToolRegistry) {
    this.server = server;
    this.toolRegistry = toolRegistry;
    this.setupHandlers();
  }

  /**
   * Set up request handlers
   */
  private setupHandlers(): void {
    this.setupListToolsHandler();
    this.setupCallToolHandler();
  }

  /**
   * Set up handler for ListTools requests
   */
  private setupListToolsHandler(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolRegistry.getAllToolDefinitions(),
      };
    });
  }

  /**
   * Set up handler for CallTool requests
   */
  private setupCallToolHandler(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const toolName = request.params.name;
        const tool = this.toolRegistry.getTool(toolName);
        
        if (!tool) {
          return {
            content: [
              {
                type: 'text',
                text: `Azure DevOps API tool '${toolName}' is not yet implemented.`,
              },
            ],
          };
        }
        
        return await tool.execute(request.params.arguments);
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
}
