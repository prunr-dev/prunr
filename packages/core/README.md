# `@prunr-dev/core`

Pure TypeScript **probe engine** for Prunr. This package decides which `TriageAction` to recommend for a URL.

**Framework-free by design:** no Hono, Next.js, or MCP SDK. Apps call `probeUrl()` and map the result to their transport.

## Why this package exists

Triage logic must be identical whether the caller is the REST API or the MCP server. Centralizing probes here prevents duplicated heuristics and keeps SSRF / WAF rules in one place.

## Files

| File | Purpose |
| --- | --- |
| `src/ssrf.ts` | URL/protocol sanitation and private-IP (SSRF) guards |
| `src/llms-txt.ts` | Discover `/llms.txt` and `/.well-known/llms.txt` |
| `src/shields.ts` | Passive Cloudflare / Turnstile / DataDome heuristics |
| `src/probe.ts` | Orchestrates Steps A–D and returns `TriageResult` |
| `src/index.ts` | Public barrel (`probeUrl` and related helpers) |

## Pipeline

```text
input URL
   │
   ▼
Step A  ssrf.ts      validate protocol + block private/metadata IPs
   │
   ▼
Step B  llms-txt.ts  parallel origin + llms.txt probes (2s timeout)
   │     (+ origin fetch inside probe.ts)
   ▼
Step C  shields.ts   inspect headers / cookies / body snippet
   │
   ▼
Step D  probe.ts     synthesize TriageAction → TriageResult
```

Action priority (highest wins):  
`ERROR_UNREACHABLE` → `WAF_BLOCKED` → `USE_LLMS_TXT` → `HEADLESS_REQUIRED` → `FETCH_RAW`

## Status

Phase 1 ships **documented stubs**: public signatures and pipeline comments are in place; live `fetch` / DNS checks land next. Calling `probeUrl` currently returns a typed unreachable stub so dependents can wire up against a stable API.

## Usage

```ts
import { probeUrl } from '@prunr-dev/core';

const result = await probeUrl('https://example.com/docs');
// result.action → TriageAction
```

## Scripts

```bash
pnpm --filter @prunr-dev/core build
pnpm --filter @prunr-dev/core typecheck
```

Depends on `@prunr-dev/types` via `workspace:*`.
