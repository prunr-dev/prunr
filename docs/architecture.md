# Architecture

High-level map of how savemytokens pieces fit together. Keep this doc short; package READMEs own the details. For a plain-language walkthrough, see [eli5.md](./eli5.md). To step through requests in the debugger, see [debugging.md](./debugging.md).

## Goals

1. **One decision engine** — `@savemytokens/core` owns all triage logic.
2. **One contract** — `@savemytokens/types` is the shared wire/type surface.
3. **Many entry points** — REST, MCP, and web all call the same engine (web via the API).

## Dependency graph

```text
@savemytokens/types          (leaf — no workspace deps)
        ▲
        │
@savemytokens/core           (probe engine; Node built-ins + types only)
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
- **web** types responses with `@savemytokens/types` and calls the REST API; it does not run probes in the browser.

## Request flow

```text
Agent / IDE / Browser
        │
        ├─► apps/api   GET /v1/triage?url=…
        │       ├─► rate limit (Upstash, fail-open)
        │       ├─► short TTL cache (Upstash, fail-open)
        │       └─► core.probeUrl(url) ─► TriageResult
        │
        ├─► apps/mcp   tool triage_url (local stdio)
        │       └─► core.probeUrl(url) ─► TriageResult
        │
        └─► apps/web   UI (savemytokens.dev)
                └─► fetch(api /v1/triage) ─► render TriageResult
```

## Deploy topology (MVP)

| Surface | Host                        | Notes                                         |
| ------- | --------------------------- | --------------------------------------------- |
| Web     | Vercel project → `apps/web` | `NEXT_PUBLIC_SAVEMYTOKENS_API_URL`            |
| API     | Vercel project → `apps/api` | `api/index.ts` + `CORS_ORIGINS` + Upstash     |
| MCP     | Local stdio                 | Same engine; zero-install try via hosted REST |

## Probe pipeline (core)

Implemented in `@savemytokens/core` (see that package README):

1. **SSRF & protocol** — HTTP/HTTPS only; DNS lookup; block private / metadata IPs (fail closed).
2. **Parallel probes** — origin GET (4KB body cap) + `/llms.txt` + `/.well-known/llms.txt` under one 2s `AbortSignal`.
3. **Shield heuristics** — Cloudflare, Turnstile, DataDome from headers/cookies/body snippet.
4. **SPA shell check** — conservative empty-hydration heuristic → `HEADLESS_REQUIRED`.
5. **Synthesize** — pick a `TriageAction` by priority and return `TriageResult`.

Priority: `ERROR_UNREACHABLE` → `WAF_BLOCKED` → `USE_LLMS_TXT` → `HEADLESS_REQUIRED` → `FETCH_RAW`.

## Error model

- **Agent-facing probe outcomes** (timeout, DNS failure, network error) stay HTTP `200` with `TriageResult.action = ERROR_UNREACHABLE`.
- **Invalid URL / SSRF blocks** are mapped by the API to **RFC 7807** Problem Details (`application/problem+json`).
- **Rate limits** return `429` problem JSON when Upstash is configured.

## Apps (entry points)

| App | Package             | Transport         | Notes                                   |
| --- | ------------------- | ----------------- | --------------------------------------- |
| API | `@savemytokens/api` | HTTP (Hono)       | `GET /v1/triage?url=`, `GET /health`    |
| MCP | `@savemytokens/mcp` | stdio MCP         | tool `triage_url` → JSON `TriageResult` |
| Web | `@savemytokens/web` | Next.js + daisyUI | Corduroy visualizer → REST              |

Both API and MCP call `probeUrl()` from `@savemytokens/core` only; they must not reimplement triage heuristics.
