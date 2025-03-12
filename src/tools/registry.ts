/**
 * Azure DevOps MCP Server - Tool Registry
 * 
 * @copyright Copyright (c) 2025 Aaron Bockelie <aaronsb@gmail.com>
 * @license MIT
 */
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ADOApiClient } from '../api/client/index.js';
import { EntityToolFactory } from './factory.js';

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
    // Define the core entity tools we know we'll support
    const coreTools = [
      EntityToolFactory.createProjectsTool(this.apiClient),
      EntityToolFactory.createRepositoriesTool(this.apiClient),
      EntityToolFactory.createWorkItemsTool(this.apiClient),
      EntityToolFactory.createPullRequestsTool(this.apiClient),
      EntityToolFactory.createPipelinesTool(this.apiClient),
    ];
    
    // Register all core entity tools
    for (const tool of coreTools) {
      this.registerTool(tool);
    }
    
    console.debug(`Initialized ${coreTools.length} entity tools`);
  }

  /**
   * Register a tool
   * @param tool Tool instance
   */
  registerTool(tool: Tool & { getDefinition(): ToolDefinition }): void {
    const definition = tool.getDefinition();
    
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
        `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
