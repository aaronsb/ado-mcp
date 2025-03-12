#!/usr/bin/env node
/**
 * Azure DevOps MCP Server
 * 
 * @copyright Copyright (c) 2025 Aaron Bockelie <aaronsb@gmail.com>
 * @license MIT
 */
import { startServer } from './server.js';

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
