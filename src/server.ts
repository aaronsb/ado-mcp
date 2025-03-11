import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ADOApiClient } from './api/client/index.js';
import { ConfigManager } from './config/config.js';
import { registerRequestHandlers } from './handlers/request.handlers.js';
import { getServerCapabilities } from './server.capabilities.js';

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  try {
    // Load configuration
    const config = ConfigManager.loadConfig();
    ConfigManager.validateConfig(config);
    console.debug('Loaded configuration:', {
      organization: config.organization,
      project: config.project,
      baseUrl: config.api?.baseUrl,
    });
    
    // Create API client
    const apiConfig = {
      organization: config.organization,
      project: config.project,
      credentials: {
        pat: config.credentials.pat
      },
      baseUrl: config.api?.baseUrl,
      version: config.api?.version,
      retry: config.api?.retry
    };
    const apiClient = new ADOApiClient(apiConfig);
    console.debug('Created API client');
    
    // Create server
    const server = new Server(
      {
        name: 'azure-devops-mcp',
        version: '0.1.0',
      },
      getServerCapabilities(apiClient)
    );
    console.debug('Created server');
    
    // Register request handlers
    registerRequestHandlers(server, apiClient);
    console.debug('Registered request handlers');
    
    // Set up error handler
    server.onerror = (error) => {
      console.error('Server error:', error);
    };
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.debug('Server connected to transport');
    
    // Handle process signals
    process.on('SIGINT', async () => {
      console.debug('Received SIGINT, shutting down');
      await server.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.debug('Received SIGTERM, shutting down');
      await server.close();
      process.exit(0);
    });
    
    console.debug('Server started');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
