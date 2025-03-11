import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ADOApiClient } from '../api/client/index.js';
import { ListProjectsTool } from './project/index.js';

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Tool interface
 */
export interface Tool {
  execute(args: unknown): Promise<any>;
}

/**
 * Tool constructor interface
 */
export interface ToolConstructor {
  new(apiClient: ADOApiClient): Tool;
  getDefinition(): ToolDefinition;
}

/**
 * Registry for Azure DevOps MCP tools
 * Manages tool registration, lookup, and execution
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolDefinitions: Map<string, ToolDefinition> = new Map();
  private apiClient: ADOApiClient;

  /**
   * Create a new tool registry
   * @param apiClient API client
   */
  constructor(apiClient: ADOApiClient) {
    this.apiClient = apiClient;
    this.initializeTools();
  }

  /**
   * Initialize all tools
   */
  private initializeTools(): void {
    // Project tools
    this.registerTool(ListProjectsTool);
    
    // TODO: Register other tools as they are implemented
    // Work item tools
    // Repository tools
    // Pull request tools
    // Branch tools
    // Pipeline tools
  }

  /**
   * Register a tool
   * @param toolClass Tool class
   */
  registerTool(toolClass: ToolConstructor): void {
    const definition = toolClass.getDefinition();
    const tool = new toolClass(this.apiClient);
    
    this.tools.set(definition.name, tool);
    this.toolDefinitions.set(definition.name, definition);
    
    console.debug(`Registered tool: ${definition.name}`);
  }

  /**
   * Get a tool by name
   * @param name Tool name
   * @returns Tool instance or undefined if not found
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool definitions
   * @returns Array of tool definitions
   */
  getAllToolDefinitions(): ToolDefinition[] {
    return Array.from(this.toolDefinitions.values());
  }

  /**
   * Execute a tool
   * @param name Tool name
   * @param args Tool arguments
   * @returns Tool execution result
   * @throws McpError if tool not found or execution fails
   */
  async executeTool(name: string, args: unknown): Promise<any> {
    const tool = this.getTool(name);
    
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Tool not found: ${name}`
      );
    }
    
    try {
      return await tool.execute(args);
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
