# `@prunr-dev/core`

Pure TypeScript **probe engine** for Prunr. This package decides which `TriageAction` to recommend for a URL.

**Framework-free by design:** no Hono, Next.js, or MCP SDK. Apps call `probeUrl()` and map the result to their transport.

## Why this package exists

Triage logic must be identical whether the caller is the REST API or the MCP server. Centralizing probes here prevents duplicated heuristics and keeps SSRF / WAF rules in one place.

## Files

| File                  | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `src/ssrf.ts`         | URL/protocol sanitation, DNS lookup, private-IP (SSRF) guards |
| `src/fetch-origin.ts` | Capped GET helper (4KB body snippet, shared AbortSignal)      |
| `src/llms-txt.ts`     | Discover `/llms.txt` and `/.well-known/llms.txt`              |
| `src/shields.ts`      | Passive Cloudflare / Turnstile / DataDome heuristics          |
| `src/spa.ts`          | Empty SPA-shell heuristic for `HEADLESS_REQUIRED`             |
| `src/probe.ts`        | Orchestrates Steps A–D and returns `TriageResult`             |
| `src/index.ts`        | Public barrel (`probeUrl` and related helpers)                |

## Pipeline

```text
input URL
   │
   ▼
Step A  ssrf.ts      validate protocol + DNS + block private/metadata IPs
   │
   ▼
Step B  parallel     origin GET + llms.txt paths (2s AbortSignal budget)
   │
   ▼
Step C  shields.ts   inspect headers / cookies / body snippet
   │     spa.ts      empty hydration-shell check
   ▼
Step D  probe.ts     synthesize TriageAction → TriageResult
```

Action priority (highest wins):  
`ERROR_UNREACHABLE` → `WAF_BLOCKED` → `USE_LLMS_TXT` → `HEADLESS_REQUIRED` → `FETCH_RAW`

## Probe behavior

- **Timeout:** all outbound work shares `AbortSignal.timeout(2000)`.
- **User-Agent:** `Prunr/0.1 (+https://prunr.dev)`.
- **Body cap:** first ~4KB retained for shield / SPA sniffing (`byteLength` recorded).
- **SSRF:** fail closed on DNS errors; reject loopback, RFC1918, link-local, ULA, and metadata IPs (including IPv4-mapped).
- **llms.txt:** prefers `/llms.txt` over `/.well-known/llms.txt` when both return text `200`s.
- **Errors:** DNS / timeout / network failures become `TriageResult` with `action: ERROR_UNREACHABLE` (not thrown). Invalid URL / SSRF reasons stay recognizable for the API’s RFC 7807 mapping.

## Status

Phase 2 live probes are implemented in this package. REST / MCP / web remain thin transports over `probeUrl()`.

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
pnpm --filter @prunr-dev/core test
```

Depends on `@prunr-dev/types` via `workspace:*`.
