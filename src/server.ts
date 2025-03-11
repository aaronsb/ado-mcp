import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './config/index.js';
import { ADOService } from './api/index.js';
import { ToolRegistry } from './tools/index.js';
import { RequestHandlers } from './handlers/index.js';
import { getServerCapabilities } from './server.capabilities.js';

/**
 * Azure DevOps MCP server
 * Main server class that initializes and manages the MCP server
 */
export class AzureDevOpsServer {
  private server: Server;
  private service: ADOService;
  private toolRegistry: ToolRegistry;
  private requestHandlers: RequestHandlers;

  /**
   * Create a new Azure DevOps MCP server
   */
  constructor() {
    // Load configuration
    const config = ConfigManager.loadConfig();
    ConfigManager.validateConfig(config);
    
    // Initialize service
    this.service = new ADOService(config);
    
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(this.service.getApiClient());
    
    // Initialize server
    this.server = new Server(
      {
        name: 'azure-devops-server',
        version: '0.1.0',
      },
      getServerCapabilities(this.service.getApiClient())
    );
    
    // Initialize request handlers
    this.requestHandlers = new RequestHandlers(this.server, this.toolRegistry);
    
    // Set up error handling
    this.setupErrorHandling();
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Run the server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    const timestamp = new Date().toISOString();
    console.error(`Azure DevOps MCP server running on stdio (started at ${timestamp})`);
  }
}
