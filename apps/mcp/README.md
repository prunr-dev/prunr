# `@savemytokens/mcp`

Standalone **Model Context Protocol** server for savemytokens. Exposes the `triage_url` tool to IDEs such as Cursor and Claude Desktop.

Thin transport layer over `@savemytokens/core` — same decision engine as the REST API.

## Why this app exists

Many AI agents already speak MCP. Shipping a stdio server lets those hosts call savemytokens without wiring HTTP themselves.

## Files

| File            | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `src/server.ts` | Registers the `triage_url` tool on an `McpServer` |
| `src/index.ts`  | stdio transport entry (`serveStdio`)              |

## Tool: `triage_url`

| Input | Type         | Description                     |
| ----- | ------------ | ------------------------------- |
| `url` | string (URL) | Absolute http(s) URL to inspect |

Returns JSON text content: a serialized `TriageResult` from `@savemytokens/types`.

For a **zero-install** try without running this process, call the hosted REST API instead:

```bash
curl "https://api.savemytokens.dev/v1/triage?url=https://example.com"
```

## Run locally

```bash
pnpm --filter @savemytokens/mcp build
pnpm --filter @savemytokens/mcp start
```

Example Cursor MCP config (after build):

```json
{
  "mcpServers": {
    "savemytokens": {
      "command": "node",
      "args": ["/absolute/path/to/savemytokens/apps/mcp/dist/index.js"]
    }
  }
}
```

## Scripts

```bash
pnpm --filter @savemytokens/mcp dev
pnpm --filter @savemytokens/mcp build
pnpm --filter @savemytokens/mcp start
```

Depends on `@savemytokens/core`, `@savemytokens/types`, `@modelcontextprotocol/server`, and `zod` via `workspace:*` / npm.
