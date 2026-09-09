#!/usr/bin/env node
/**
 * MCP stdio entrypoint for @savemytokens/mcp.
 *
 * Configure in Cursor / Claude Desktop as a stdio MCP server pointing at
 * this package's `start` script or the `savemytokens-mcp` bin after build.
 */
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { createMcpServer } from './server.js';

serveStdio(() => createMcpServer());
