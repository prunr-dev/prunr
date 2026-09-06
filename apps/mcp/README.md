# `@prunr-dev/mcp`

Standalone **Model Context Protocol** server for Prunr. Exposes the `triage_url` tool to IDEs such as Cursor and Claude Desktop.

Thin transport layer over `@prunr-dev/core` — same decision engine as the REST API.

## Why this app exists

Many AI agents already speak MCP. Shipping a stdio server lets those hosts call Prunr without wiring HTTP themselves.

## Files

| File            | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `src/server.ts` | Registers the `triage_url` tool on an `McpServer` |
| `src/index.ts`  | stdio transport entry (`serveStdio`)              |

## Tool: `triage_url`

| Input | Type         | Description                     |
| ----- | ------------ | ------------------------------- |
| `url` | string (URL) | Absolute http(s) URL to inspect |

Returns JSON text content: a serialized `TriageResult` from `@prunr-dev/types`.

For a **zero-install** try without running this process, call the hosted REST API instead:

```bash
curl "https://api.prunr.dev/v1/triage?url=https://example.com"
```

## Run locally

```bash
pnpm --filter @prunr-dev/mcp build
pnpm --filter @prunr-dev/mcp start
```

Example Cursor MCP config (after build):

```json
{
  "mcpServers": {
    "prunr": {
      "command": "node",
      "args": ["/absolute/path/to/prunr/apps/mcp/dist/index.js"]
    }
  }
}
```

## Scripts

```bash
pnpm --filter @prunr-dev/mcp dev
pnpm --filter @prunr-dev/mcp build
pnpm --filter @prunr-dev/mcp start
```

Depends on `@prunr-dev/core`, `@prunr-dev/types`, `@modelcontextprotocol/server`, and `zod` via `workspace:*` / npm.
