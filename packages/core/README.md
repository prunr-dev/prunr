# `@savemytokens/core`

Pure TypeScript **probe engine** for savemytokens. This package decides which `TriageAction` to recommend for a URL.

**Framework-free by design:** no Hono, Next.js, or MCP SDK. Apps call `probeUrl()` and map the result to their transport.

## Why this package exists

Triage logic must be identical whether the caller is the REST API or the MCP server. Centralizing probes here prevents duplicated heuristics and keeps SSRF / WAF rules in one place.

## Files

| File                  | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `src/ssrf.ts`         | URL/protocol sanitation, DNS lookup, private-IP (SSRF) guards |
| `src/fetch-origin.ts` | Capped GET helper (4KB body snippet, shared AbortSignal)      |
| `src/llms-txt.ts`     | Discover `/llms.txt` and `/.well-known/llms.txt`              |
| `src/shields.ts`      | Challenge-grade Cloudflare / Turnstile / DataDome heuristics (CDN-only ≠ WAF) |
| `src/spa.ts`          | Empty SPA-shell heuristic for `HEADLESS_REQUIRED`             |
| `src/token-estimate.ts` | Byte-heuristic `tokenEstimate` (baseline / action / %)      |
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
`ERROR_UNREACHABLE` → challenge `WAF_BLOCKED` → `USE_LLMS_TXT` → `HEADLESS_REQUIRED` → `FETCH_RAW`

CDN-only Cloudflare markers (`cf-ray`, `server: cloudflare`, `__cf_bm`) are recorded as `cdn:*` evidence with `shields.detected: false` and do **not** produce `WAF_BLOCKED`. Challenge signals (`cf-mitigated`, Turnstile / “Just a moment…”, DataDome, 403/429 + challenge body) set `detected: true` and beat llms.txt.

## Probe behavior

- **Timeout:** all outbound work shares `AbortSignal.timeout(2000)`.
- **User-Agent:** `savemytokens/0.1 (+https://savemytokens.dev)`.
- **Body cap:** first ~4KB retained for shield / SPA sniffing (`byteLength` recorded).
- **SSRF:** fail closed on DNS errors; reject loopback, RFC1918, link-local, ULA, and metadata IPs (including IPv4-mapped).
- **llms.txt:** prefers `/llms.txt` over `/.well-known/llms.txt` when both return text `200`s.
- **Token estimate:** byte-heuristic from observed / `Content-Length` sizes (`tokenEstimate`); not measured agent usage.
- **Errors:** DNS / timeout / network failures become `TriageResult` with `action: ERROR_UNREACHABLE` (not thrown). Invalid URL / SSRF reasons stay recognizable for the API’s RFC 7807 mapping.

## Status

Phase 2 live probes are implemented in this package. REST / MCP / web remain thin transports over `probeUrl()`.

## Usage

```ts
import { probeUrl } from '@savemytokens/core';

const result = await probeUrl('https://example.com/docs');
// result.action → TriageAction
```

## Scripts

```bash
pnpm --filter @savemytokens/core build
pnpm --filter @savemytokens/core typecheck
pnpm --filter @savemytokens/core test
```

Depends on `@savemytokens/types` via `workspace:*`.
