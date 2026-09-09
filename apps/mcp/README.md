# `@savemytokens/mcp`

Standalone **Model Context Protocol** server for savemytokens. Exposes the `triage_url` tool to IDEs such as Cursor and Claude Desktop.

Thin transport layer over `@savemytokens/core` — same decision engine as the REST API (in-process; **does not** call the hosted REST API).

## Prerequisites

- **Node.js 24+** (pinned to `24.x` for Vercel; see repo `.node-version`)
- This monorepo cloned locally (`pnpm install` at the repo root)
- Outbound network access (the probe fetches public URLs)
- Package is **`private` / not published to npm** — there is no `npx @savemytokens/mcp` yet
- Transport is **stdio only** (no remote HTTP MCP)

## Install & build

From the repository root:

```bash
pnpm install
pnpm --filter @savemytokens/mcp build
```

That compiles `apps/mcp/dist/index.js` (and workspace deps). Point your MCP client at that absolute path.

## Setup: Cursor

1. Build as above.
2. Open Cursor MCP settings (or edit your MCP config file) and add:

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

3. Replace `/absolute/path/to/savemytokens` with your real clone path.
4. Restart Cursor (or reload MCP servers) so the tool list refreshes.

No env vars are required.

## Setup: Claude Desktop

1. Build as above.
2. Edit Claude Desktop’s config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. Add the same server block:

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

4. Fully quit and reopen Claude Desktop.

## Tool: `triage_url`

| Input | Type         | Description                     |
| ----- | ------------ | ------------------------------- |
| `url` | string (URL) | Absolute http(s) URL to inspect |

Returns JSON text content: a serialized `TriageResult` from `@savemytokens/types` (action, `tokenEstimate`, llms.txt discovery, shields, latency, reason).

The handler calls `probeUrl()` from `@savemytokens/core` directly — same synthesis as `GET /v1/triage`, without HTTP.

### Verify

1. Confirm the client lists a `triage_url` tool under the `savemytokens` server.
2. Prompt something like: _Before fetching https://example.com, call triage_url and follow the recommended action._
3. You should get JSON with `action`, `tokenEstimate`, `latencyMs`, etc.

## Limits

- **SSRF:** localhost, private, and cloud-metadata IPs are blocked.
- **Timeout:** probes share a ~2s AbortSignal budget.
- **Token estimate:** byte-heuristic (`tokenEstimate.method: "byte_heuristic"`), not measured agent usage.

### Zero-install alternative (REST)

If you only need a one-off triage without running this process:

```bash
curl "https://api.savemytokens.dev/v1/triage?url=https://example.com"
```

## Troubleshooting

| Symptom                                          | Likely fix                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Tool missing after config change                 | Restart the client; confirm JSON is valid                         |
| `Cannot find module` / import errors             | Re-run `pnpm install` and `pnpm --filter @savemytokens/mcp build` |
| Stale behavior after code changes                | Rebuild `dist/` — clients run the compiled entry, not `src/`      |
| Wrong path                                       | `args` must be an **absolute** path to `apps/mcp/dist/index.js`   |
| Node version errors                              | Use Node 24 (`node -v`; see `.node-version`)                      |
| Probe returns `ERROR_UNREACHABLE` for local URLs | Expected — SSRF guard blocks private targets                      |

## Run manually (optional)

```bash
pnpm --filter @savemytokens/mcp build
pnpm --filter @savemytokens/mcp start
```

`start` speaks MCP over stdio (useful for debugging with `node --inspect-brk`). Prefer `dev` (`tsx src/index.ts`) only for local iteration — wire clients to the **built** `dist/index.js`.

## Files

| File            | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `src/server.ts` | Registers the `triage_url` tool on an `McpServer` |
| `src/index.ts`  | stdio transport entry (`serveStdio`)              |

## Scripts

```bash
pnpm --filter @savemytokens/mcp dev
pnpm --filter @savemytokens/mcp build
pnpm --filter @savemytokens/mcp start
```

Depends on `@savemytokens/core`, `@savemytokens/types`, `@modelcontextprotocol/server`, and `zod` via `workspace:*` / npm.
