/**
 * Common types used across the Azure DevOps MCP server
 */

/**
 * Base interface for all Azure DevOps entities
 */
export interface BaseEntity {
  id: string;
  name?: string;
  url?: string;
}

/**
 * Reference to another entity
 */
export interface EntityReference {
  id: string;
  name?: string;
  url?: string;
}

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  top?: number;
  skip?: number;
  continuationToken?: string;
}

/**
 * Pagination result for list operations
 */
export interface PaginatedResult<T> {
  items: T[];
  continuationToken?: string;
  count: number;
}

/**
 * Error response from Azure DevOps API
 */
export interface ADOErrorResponse {
  $id?: string;
  innerException?: ADOErrorResponse;
  message?: string;
  typeName?: string;
  typeKey?: string;
  errorCode?: number;
  eventId?: number;
  customProperties?: Record<string, any>;
}

/**
 * Common API response structure
 */
export interface ApiResponse<T> {
  count?: number;
  value: T[];
}
