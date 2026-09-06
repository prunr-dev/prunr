# Architecture

High-level map of how Prunr pieces fit together. Keep this doc short; package READMEs own the details.

## Goals

1. **One decision engine** — `@prunr-dev/core` owns all triage logic.
2. **One contract** — `@prunr-dev/types` is the shared wire/type surface.
3. **Many entry points** — REST, MCP, and web all call the same engine (web via the API).

## Dependency graph

```text
@prunr-dev/types          (leaf — no workspace deps)
        ▲
        │
@prunr-dev/core           (probe engine; Node built-ins + types only)
        ▲
        │
 ┌──────┼──────────┐
 │      │          │
api    mcp        web ──HTTP──► api
```

Rules:

- **types** never imports core or apps.
- **core** never imports Hono, Next, or the MCP SDK.
- **apps** may depend on `core` and/or `types` via `workspace:*`.
- **web** types responses with `@prunr-dev/types` and calls the REST API; it does not run probes in the browser.

## Request flow

```text
Agent / IDE / Browser
        │
        ├─► apps/api   GET /v1/triage?url=…
        │       └─► core.probeUrl(url) ─► TriageResult
        │
        ├─► apps/mcp   tool triage_url
        │       └─► core.probeUrl(url) ─► TriageResult
        │
        └─► apps/web   UI
                └─► fetch(api /v1/triage) ─► render TriageResult
```

## Probe pipeline (core)

Implemented in `@prunr-dev/core` (see that package README):

1. **SSRF & protocol** — HTTP/HTTPS only; DNS lookup; block private / metadata IPs (fail closed).
2. **Parallel probes** — origin GET (4KB body cap) + `/llms.txt` + `/.well-known/llms.txt` under one 2s `AbortSignal`.
3. **Shield heuristics** — Cloudflare, Turnstile, DataDome from headers/cookies/body snippet.
4. **SPA shell check** — conservative empty-hydration heuristic → `HEADLESS_REQUIRED`.
5. **Synthesize** — pick a `TriageAction` by priority and return `TriageResult`.

Priority: `ERROR_UNREACHABLE` → `WAF_BLOCKED` → `USE_LLMS_TXT` → `HEADLESS_REQUIRED` → `FETCH_RAW`.

## Error model

- **Agent-facing probe outcomes** (timeout, DNS failure, network error) stay HTTP `200` with `TriageResult.action = ERROR_UNREACHABLE`.
- **Invalid URL / SSRF blocks** are mapped by the API to **RFC 7807** Problem Details (`application/problem+json`), defined in `@prunr-dev/types` (`ProblemDetails`, `Problems` helpers).

## Apps (entry points)

| App | Package | Transport | Notes |
| --- | --- | --- | --- |
| API | `@prunr-dev/api` | HTTP (Hono) | `GET /v1/triage?url=`, `GET /health` |
| MCP | `@prunr-dev/mcp` | stdio MCP | tool `triage_url` → JSON `TriageResult` |
| Web | `@prunr-dev/web` | Next.js | Diagnostic UI — calls `GET /v1/triage` |

Both API and MCP call `probeUrl()` from `@prunr-dev/core` only; they must not reimplement triage heuristics.
