import fs from 'fs';
import path from 'path';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ADOServiceConfig } from '../api/service.js';

/**
 * Configuration manager for Azure DevOps MCP server
 * Handles loading configuration from environment variables or config file
 */
export class ConfigManager {
  /**
   * Load configuration from environment variables or config file
   * @returns Service configuration
   * @throws McpError if configuration is invalid or missing
   */
  static loadConfig(): ADOServiceConfig {
    // Try environment variables first
    if (process.env.ADO_ORGANIZATION && process.env.ADO_PAT) {
      console.debug('Loading configuration from environment variables');
      return {
        organization: process.env.ADO_ORGANIZATION,
        project: process.env.ADO_PROJECT,
        credentials: {
          pat: process.env.ADO_PAT
        },
        api: {
          baseUrl: process.env.ADO_API_URL,
          version: process.env.ADO_API_VERSION,
          retry: {
            maxRetries: process.env.ADO_API_MAX_RETRIES ? parseInt(process.env.ADO_API_MAX_RETRIES) : undefined,
            delayMs: process.env.ADO_API_DELAY_MS ? parseInt(process.env.ADO_API_DELAY_MS) : undefined,
            backoffFactor: process.env.ADO_API_BACKOFF_FACTOR ? parseFloat(process.env.ADO_API_BACKOFF_FACTOR) : undefined
          }
        }
      };
    }

    // Fall back to config file
    const configPath = path.join(process.cwd(), 'config', 'azuredevops.json');
    if (!fs.existsSync(configPath)) {
      console.error('No configuration found. Please set environment variables (ADO_ORGANIZATION, ADO_PROJECT, ADO_PAT) or create config/azuredevops.json');
      throw new McpError(
        ErrorCode.InternalError,
        'No configuration found. Please set environment variables (ADO_ORGANIZATION, ADO_PROJECT, ADO_PAT) or create config/azuredevops.json'
      );
    }

    try {
      console.debug(`Loading configuration from ${configPath}`);
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error(`Error parsing config file: ${error instanceof Error ? error.message : String(error)}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Error parsing config file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate configuration
   * @param config Configuration to validate
   * @throws McpError if configuration is invalid
   */
  static validateConfig(config: ADOServiceConfig): void {
    if (!config.organization) {
      throw new McpError(
        ErrorCode.InternalError,
        'Missing required configuration: organization'
      );
    }

    if (!config.credentials?.pat) {
      throw new McpError(
        ErrorCode.InternalError,
        'Missing required configuration: credentials.pat'
      );
    }
  }
}
