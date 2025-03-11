import { ToolRegistry } from './tools/registry.js';
import { ADOApiClient } from './api/client/index.js';

/**
 * Get server capabilities dynamically based on registered tools
 * @param apiClient API client
 * @returns Server capabilities
 */
export function getServerCapabilities(apiClient: ADOApiClient) {
  // Create a tool registry to get all tool definitions
  const registry = new ToolRegistry(apiClient);
  const toolDefinitions = registry.getAllToolDefinitions();
  
  // Build tools object dynamically
  const tools: Record<string, boolean> = {};
  
  // Add all registered tools
  for (const tool of toolDefinitions) {
    tools[tool.name] = true;
  }
  
  return {
    capabilities: {
      tools,
    },
  };
}
