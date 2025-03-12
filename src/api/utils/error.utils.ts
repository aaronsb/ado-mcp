import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  Authentication = 'authentication',
  Authorization = 'authorization',
  NotFound = 'not_found',
  Validation = 'validation',
  RateLimit = 'rate_limit',
  ServiceUnavailable = 'service_unavailable',
  Unknown = 'unknown',
}

/**
 * Enhanced error interface with additional context
 */
export interface EnhancedErrorContext {
  category: ErrorCategory;
  source: string;
  operation: string;
  details?: Record<string, any>;
  originalError?: any;
}

/**
 * Create a standardized MCP error with enhanced context
 * @param code MCP error code
 * @param message Error message
 * @param context Additional error context
 * @returns McpError with enhanced context
 */
export function createError(
  code: ErrorCode,
  message: string,
  context: Partial<EnhancedErrorContext>
): McpError {
  // Log the error with full context for debugging
  console.error(`[${context.source}] ${context.operation} error:`, {
    code,
    message,
    category: context.category,
    details: context.details,
    originalError: context.originalError,
  });

  // Create a user-friendly error message
  const userMessage = createUserFriendlyMessage(message, context);
  
  return new McpError(code, userMessage);
}

/**
 * Create a user-friendly error message based on the error context
 * @param message Original error message
 * @param context Error context
 * @returns User-friendly error message
 */
function createUserFriendlyMessage(
  message: string,
  context: Partial<EnhancedErrorContext>
): string {
  // Base message
  let userMessage = message;

  // Add category-specific context
  switch (context.category) {
    case ErrorCategory.Authentication:
      userMessage = `Authentication failed: ${message}. Please check your credentials.`;
      break;
    case ErrorCategory.Authorization:
      userMessage = `Authorization failed: ${message}. You don't have permission to perform this operation.`;
      break;
    case ErrorCategory.NotFound:
      userMessage = `Resource not found: ${message}. Please check that the requested resource exists.`;
      break;
    case ErrorCategory.Validation:
      userMessage = `Validation failed: ${message}. Please check your input parameters.`;
      break;
    case ErrorCategory.RateLimit:
      userMessage = `Rate limit exceeded: ${message}. Please try again later.`;
      break;
    case ErrorCategory.ServiceUnavailable:
      userMessage = `Service unavailable: ${message}. Please try again later.`;
      break;
    default:
      // For unknown errors, include the operation for context
      if (context.operation) {
        userMessage = `Error during ${context.operation}: ${message}`;
      }
  }

  // Add troubleshooting tips for specific error types
  if (context.details?.troubleshooting) {
    userMessage += ` ${context.details.troubleshooting}`;
  }

  return userMessage;
}

/**
 * Handle API errors and convert them to McpError with enhanced context
 * @param error Original error
 * @param source Error source (e.g., 'ProjectsTool', 'ApiClient')
 * @param operation Operation being performed (e.g., 'listProjects', 'getProject')
 * @returns McpError with enhanced context
 */
export function handleApiError(
  error: any,
  source: string,
  operation: string
): McpError {
  // Default error information
  let code = ErrorCode.InternalError;
  let message = error instanceof Error ? error.message : String(error);
  let category = ErrorCategory.Unknown;
  
  // Extract status code if available
  const statusCode = error.statusCode || error.status;
  
  // Determine error category and code based on status code
  if (statusCode) {
    if (statusCode === 401) {
      category = ErrorCategory.Authentication;
      code = ErrorCode.InvalidRequest;
    } else if (statusCode === 403) {
      category = ErrorCategory.Authorization;
      code = ErrorCode.InvalidRequest;
    } else if (statusCode === 404) {
      category = ErrorCategory.NotFound;
      code = ErrorCode.InvalidRequest;
    } else if (statusCode === 400) {
      category = ErrorCategory.Validation;
      code = ErrorCode.InvalidParams;
    } else if (statusCode === 429) {
      category = ErrorCategory.RateLimit;
      code = ErrorCode.InternalError;
    } else if (statusCode >= 500) {
      category = ErrorCategory.ServiceUnavailable;
      code = ErrorCode.InternalError;
    }
  }
  
  // Extract more detailed message if available
  if (error.message) {
    message = error.message;
  } else if (error.body?.message) {
    message = error.body.message;
  }
  
  // Create enhanced error
  return createError(code, message, {
    category,
    source,
    operation,
    details: {
      statusCode,
      errorCode: error.errorCode,
    },
    originalError: error,
  });
}
