#!/usr/bin/env node
import { AzureDevOpsServer } from './server.js';

const server = new AzureDevOpsServer();
server.run().catch(console.error);
