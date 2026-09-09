import { McpServer } from '@modelcontextprotocol/server';
import { probeUrl } from '@savemytokens/core';
import * as z from 'zod/v4';

/**
 * Builds the savemytokens MCP server instance with the `triage_url` tool.
 *
 * The tool wraps {@link probeUrl} and returns a JSON-serialized `TriageResult`
 * so Cursor / Claude Desktop agents can decide how to fetch a page.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'savemytokens',
    version: '0.0.0',
  });

  server.registerTool(
    'triage_url',
    {
      description:
        'Pre-flight triage for a URL: recommend USE_LLMS_TXT, FETCH_RAW, HEADLESS_REQUIRED, WAF_BLOCKED, or ERROR_UNREACHABLE before the agent fetches content.',
      inputSchema: {
        url: z
          .string()
          .url()
          .describe('Absolute http(s) URL to inspect before fetching'),
      },
    },
    async ({ url }) => {
      const result = await probeUrl(url);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  return server;
}
