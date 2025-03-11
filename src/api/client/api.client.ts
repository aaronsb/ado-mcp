import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { setTimeout } from 'node:timers/promises';
import { ADOApiConfig, DEFAULT_API_CONFIG, RequestOptions, ApiErrorResponse } from './api.types.js';

/**
 * Azure DevOps API client
 * Handles authentication, request formatting, and response parsing
 */
export class ADOApiClient {
  private readonly config: ADOApiConfig;
  private readonly axiosInstance: AxiosInstance;
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
    const version = this.config.version || '7.0';
    this.baseApiUrl = `${baseUrl}/${this.config.organization}/_apis`;

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseApiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`:${this.config.credentials.pat}`).toString('base64')}`
      },
      params: {
        'api-version': version
      }
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Remove sensitive information from logs
        const sanitizedConfig = { ...config };
        if (sanitizedConfig.headers && sanitizedConfig.headers.Authorization) {
          sanitizedConfig.headers = { ...sanitizedConfig.headers };
          sanitizedConfig.headers.Authorization = 'Basic ***';
        }
        console.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, sanitizedConfig);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('Response error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute a request with retry logic
   * @param url API endpoint URL
   * @param options Request options
   * @returns API response
   */
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const config: AxiosRequestConfig = {
      method: options.method || 'GET',
      url,
      headers: options.headers,
      params: options.params,
      responseType: options.responseType as any || 'json'
    };

    if (options.body) {
      config.data = options.body;
    }

    // Add project to URL if provided and not already in URL
    if (this.config.project && !url.includes(`/${this.config.project}/`)) {
      config.url = url.replace('/_apis/', `/${this.config.project}/_apis/`);
    }

    return this.executeWithRetry<T>(async () => {
      try {
        const response = await this.axiosInstance.request<T>(config);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const data = error.response?.data as ApiErrorResponse;
          
          // Handle specific error codes
          if (status === 401 || status === 403) {
            throw new McpError(
              ErrorCode.Unauthorized,
              `Authentication failed: ${data?.message || error.message}`
            );
          } else if (status === 404) {
            throw new McpError(
              ErrorCode.NotFound,
              `Resource not found: ${data?.message || error.message}`
            );
          } else if (status === 400) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Bad request: ${data?.message || error.message}`
            );
          } else {
            throw new McpError(
              ErrorCode.InternalError,
              `Azure DevOps API error (${status}): ${data?.message || error.message}`
            );
          }
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, `${options.method || 'GET'} ${url}`);
  }

  /**
   * Execute a function with retry logic
   * @param operation Function to execute
   * @param context Context for error messages
   * @returns Operation result
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const { maxRetries = 3, delayMs = 1000, backoffFactor = 2 } = this.config.retry || {};
    let lastError: Error | null = null;
    let delay = delayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 400 (bad request) or 401/403 (unauthorized)
        if (error instanceof McpError && 
            (error.code === ErrorCode.InvalidRequest || 
             error.code === ErrorCode.Unauthorized)) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        // Wait before retrying
        await setTimeout(delay);
        delay *= backoffFactor;
      }
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to ${context} after ${maxRetries} attempts: ${lastError?.message}`
    );
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
}
