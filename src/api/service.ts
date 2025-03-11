import { ADOApiClient, ADOApiConfig } from './client/index.js';
import { ListProjectsTool } from '../tools/project/index.js';

/**
 * Service configuration
 */
export interface ADOServiceConfig {
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

/**
 * Azure DevOps service
 * Manages API client and tools
 */
export class ADOService {
  private apiClient: ADOApiClient;
  private tools: Map<string, any> = new Map();

  /**
   * Create a new ADO service
   * @param config Service configuration
   */
  constructor(config: ADOServiceConfig) {
    // Create API client
    const apiConfig: ADOApiConfig = {
      organization: config.organization,
      project: config.project,
      credentials: {
        pat: config.credentials.pat
      },
      baseUrl: config.api?.baseUrl,
      version: config.api?.version,
      retry: config.api?.retry
    };
    
    this.apiClient = new ADOApiClient(apiConfig);
    
    // Initialize tools
    this.initializeTools();
  }

  /**
   * Initialize tools
   */
  private initializeTools() {
    // Project tools
    this.registerTool(new ListProjectsTool(this.apiClient));
    
    // More tools will be added here
  }

  /**
   * Register a tool
   * @param tool Tool instance
   */
  private registerTool(tool: any) {
    const definition = (tool.constructor as any).getDefinition();
    this.tools.set(definition.name, tool);
  }

  /**
   * Get a tool by name
   * @param name Tool name
   * @returns Tool instance
   */
  getTool(name: string): any {
    return this.tools.get(name);
  }

  /**
   * Get the API client
   * @returns API client
   */
  getApiClient(): ADOApiClient {
    return this.apiClient;
  }
}
