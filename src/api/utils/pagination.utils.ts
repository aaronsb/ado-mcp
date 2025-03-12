import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  /**
   * Maximum number of items to return
   */
  maxResults?: number;
  
  /**
   * Continuation token for pagination
   */
  continuationToken?: string;
}

/**
 * Pagination result for list operations
 */
export interface PaginationResult<T> {
  /**
   * Items in the current page
   */
  items: T[];
  
  /**
   * Total count of items (if available)
   */
  count?: number;
  
  /**
   * Continuation token for the next page (if available)
   */
  continuationToken?: string;
  
  /**
   * Whether there are more items available
   */
  hasMore: boolean;
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  maxResults: 100,
  defaultMaxResults: 25,
};

/**
 * Create a pagination result from an API response
 * @param items Items in the current page
 * @param totalCount Total count of items (if available)
 * @param continuationToken Continuation token for the next page (if available)
 * @returns Pagination result
 */
export function createPaginationResult<T>(
  items: T[],
  totalCount?: number,
  continuationToken?: string
): PaginationResult<T> {
  return {
    items,
    count: totalCount,
    continuationToken,
    hasMore: !!continuationToken,
  };
}

/**
 * Validate and normalize pagination parameters
 * @param params Pagination parameters
 * @returns Normalized pagination parameters
 */
export function normalizePaginationParams(
  params?: PaginationParams
): Required<PaginationParams> {
  const maxResults = params?.maxResults 
    ? Math.min(params.maxResults, DEFAULT_PAGINATION.maxResults)
    : DEFAULT_PAGINATION.defaultMaxResults;
  
  return {
    maxResults,
    continuationToken: params?.continuationToken || '',
  };
}

/**
 * Encode a continuation token
 * @param data Data to encode
 * @returns Encoded continuation token
 */
export function encodeContinuationToken(data: Record<string, any>): string {
  try {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to encode continuation token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decode a continuation token
 * @param token Continuation token
 * @returns Decoded data
 */
export function decodeContinuationToken<T = Record<string, any>>(token: string): T {
  if (!token) {
    return {} as T;
  }
  
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString()) as T;
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid continuation token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a continuation token for Azure DevOps API pagination
 * @param continuationToken Azure DevOps continuation token
 * @param skip Current skip value
 * @param top Current top value
 * @returns Encoded continuation token
 */
export function createAdoContinuationToken(
  continuationToken: string | undefined,
  skip: number,
  top: number
): string | undefined {
  if (!continuationToken && skip === 0) {
    return undefined;
  }
  
  return encodeContinuationToken({
    continuationToken,
    skip: skip + top,
    top,
  });
}

/**
 * Parse an Azure DevOps continuation token
 * @param token Encoded continuation token
 * @returns Decoded Azure DevOps pagination parameters
 */
export interface AdoPaginationParams {
  continuationToken?: string;
  skip: number;
  top: number;
}

export function parseAdoContinuationToken(token?: string): AdoPaginationParams {
  if (!token) {
    return { skip: 0, top: DEFAULT_PAGINATION.defaultMaxResults };
  }
  
  const decoded = decodeContinuationToken<AdoPaginationParams>(token);
  
  return {
    continuationToken: decoded.continuationToken,
    skip: decoded.skip || 0,
    top: decoded.top || DEFAULT_PAGINATION.defaultMaxResults,
  };
}
