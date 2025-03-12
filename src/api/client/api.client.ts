import * as azdev from 'azure-devops-node-api';
import { ADOApiConfig, DEFAULT_API_CONFIG } from './api.types.js';
import { handleApiError } from '../utils/index.js';

/**
 * Azure DevOps API client using the official azure-devops-node-api library
 * Handles authentication, request formatting, and response parsing
 */
export class ADOApiClient {
  private readonly config: ADOApiConfig;
  private readonly connection: azdev.WebApi;
  private readonly baseApiUrl: string;

  /**
   * Create a new API client
   * @param config API client configuration
   */
  constructor(config: ADOApiConfig) {
    // Merge with default config
    this.config = {
      ...DEFAULT_API_CONFIG,
      ...config,
      retry: {
        ...DEFAULT_API_CONFIG.retry,
        ...config.retry
      }
    } as ADOApiConfig;

    // Create base API URL
    const baseUrl = this.config.baseUrl || 'https://dev.azure.com';
    this.baseApiUrl = `${baseUrl}/${this.config.organization}`;

    // Create authentication handler
    const authHandler = azdev.getPersonalAccessTokenHandler(this.config.credentials.pat);
    
    // Create connection
    this.connection = new azdev.WebApi(this.baseApiUrl, authHandler, {
      allowRetries: true,
      maxRetries: this.config.retry?.maxRetries || 3
    });

    console.debug(`Initialized Azure DevOps API client for ${this.baseApiUrl}`);
  }

  /**
   * Get the Core API client
   * @returns Core API client
   */
  async getCoreApi() {
    try {
      return await this.connection.getCoreApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Core API client');
    }
  }

  /**
   * Get the Work Item Tracking API client
   * @returns Work Item Tracking API client
   */
  async getWorkItemTrackingApi() {
    try {
      return await this.connection.getWorkItemTrackingApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Work Item Tracking API client');
    }
  }

  /**
   * Get the Git API client
   * @returns Git API client
   */
  async getGitApi() {
    try {
      return await this.connection.getGitApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Git API client');
    }
  }

  /**
   * Get the Build API client
   * @returns Build API client
   */
  async getBuildApi() {
    try {
      return await this.connection.getBuildApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Build API client');
    }
  }

  /**
   * Get the Release API client
   * @returns Release API client
   */
  async getReleaseApi() {
    try {
      return await this.connection.getReleaseApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Release API client');
    }
  }

  /**
   * Get the Task API client
   * @returns Task API client
   */
  async getTaskApi() {
    try {
      return await this.connection.getTaskApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Task API client');
    }
  }

  /**
   * Get the Test API client
   * @returns Test API client
   */
  async getTestApi() {
    try {
      return await this.connection.getTestApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Test API client');
    }
  }

  /**
   * Get the Pipeline API client
   * @returns Pipeline API client
   */
  async getPipelineApi() {
    try {
      return await this.connection.getPipelinesApi();
    } catch (error) {
      throw this.handleError(error, 'Failed to get Pipeline API client');
    }
  }

  /**
   * Handle API errors and convert them to McpError
   * @param error Original error
   * @param context Error context
   * @returns McpError
   */
  private handleError(error: any, context: string): ReturnType<typeof handleApiError> {
    return handleApiError(error, 'ADOApiClient', context);
  }

  /**
   * Get the base API URL
   * @returns Base API URL
   */
  getBaseApiUrl(): string {
    return this.baseApiUrl;
  }

  /**
   * Get the current organization
   * @returns Organization name
   */
  getOrganization(): string {
    return this.config.organization;
  }

  /**
   * Get the current project
   * @returns Project name or undefined
   */
  getProject(): string | undefined {
    return this.config.project;
  }

  /**
   * Get the WebApi connection
   * @returns WebApi connection
   */
  getConnection(): azdev.WebApi {
    return this.connection;
  }
}
