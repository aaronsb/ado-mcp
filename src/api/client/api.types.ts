/**
 * API client types for Azure DevOps
 */

/**
 * Configuration for the API client
 */
export interface ADOApiConfig {
  organization: string;
  project?: string;
  baseUrl?: string;
  version?: string;
  credentials: {
    pat: string;
  };
  retry?: {
    maxRetries?: number;
    delayMs?: number;
    backoffFactor?: number;
  };
}

/**
 * Default API configuration
 */
export const DEFAULT_API_CONFIG: Partial<ADOApiConfig> = {
  baseUrl: 'https://dev.azure.com',
  version: '7.0',
  retry: {
    maxRetries: 3,
    delayMs: 1000,
    backoffFactor: 2
  }
};

/**
 * Request options for API calls
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  responseType?: 'json' | 'text' | 'arraybuffer';
}

/**
 * API response with pagination
 */
export interface PaginatedApiResponse<T> {
  count: number;
  value: T[];
  continuationToken?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  $id?: string;
  innerException?: ApiErrorResponse;
  message?: string;
  typeName?: string;
  typeKey?: string;
  errorCode?: number;
  eventId?: number;
  customProperties?: Record<string, any>;
}
