# `@prunr-dev/api`

Public **REST microservice** for Prunr triage. Thin Hono layer over `@prunr-dev/core` — no probe logic lives here.

## Why this app exists

Agents and the web UI need a simple HTTP surface. This app validates input, applies light abuse controls, calls `probeUrl()`, and returns either a `TriageResult` JSON body or an RFC 7807 problem.

## Files

| File                | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `src/app.ts`        | Hono routes (`/health`, `/v1/triage`), CORS, cache, rate limit |
| `src/env.ts`        | `CORS_ORIGINS`, Upstash detection, API version                 |
| `src/cache.ts`      | 60s Upstash Redis triage cache (fail-open)                     |
| `src/rate-limit.ts` | Per-IP Upstash Ratelimit ~30/min (fail-open)                   |
| `src/index.ts`      | Local Node server (`@hono/node-server`)                        |
| `api/index.ts`      | Vercel serverless entry (`hono/vercel`)                        |
| `vercel.json`       | Rewrite all paths to the serverless function                   |
| `.env.example`      | Env template                                                   |

## Endpoints

| Method | Path              | Description                                           |
| ------ | ----------------- | ----------------------------------------------------- |
| `GET`  | `/health`         | `{ ok, service, version }`                            |
| `GET`  | `/v1/triage?url=` | `200` + `TriageResult`, or `application/problem+json` |

Example:

```bash
pnpm --filter @prunr-dev/api dev
curl "http://localhost:8787/v1/triage?url=https://example.com"
```

Default port: **8787** (override with `PORT`).

## Environment

| Variable                   | Purpose                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `PORT`                     | Local listen port (default `8787`)                                                 |
| `CORS_ORIGINS`             | Comma-separated allowed origins (defaults include localhost + `https://prunr.dev`) |
| `UPSTASH_REDIS_REST_URL`   | Optional Redis for cache + rate limit                                              |
| `UPSTASH_REDIS_REST_TOKEN` | Optional Redis token                                                               |

Without Upstash credentials, rate limit and cache are skipped (fail-open) so local demos keep working.

Successful probes may include `X-Prunr-Cache: HIT|MISS`. Over limit returns `429` problem JSON.

## Deploy (Vercel)

Create a Vercel project with:

- **Root Directory:** `apps/api`
- **Include files outside root:** on (monorepo packages)
- **Install:** from repo root, e.g. `cd ../.. && pnpm install`
- **Build:** `cd ../.. && pnpm --filter @prunr-dev/types build && pnpm --filter @prunr-dev/core build`
- Set `CORS_ORIGINS` and Upstash env vars in the project

Suggested production host: `https://api.prunr.dev`.

## Scripts

```bash
pnpm --filter @prunr-dev/api dev
pnpm --filter @prunr-dev/api build
pnpm --filter @prunr-dev/api start
```

Depends on `@prunr-dev/core` and `@prunr-dev/types` via `workspace:*`.
