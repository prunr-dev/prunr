# `@savemytokens/api`

Public **REST microservice** for savemytokens triage. Thin Hono layer over `@savemytokens/core` — no probe logic lives here.

## Why this app exists

Agents and the web UI need a simple HTTP surface. This app validates input, applies light abuse controls, calls `probeUrl()`, and returns either a `TriageResult` JSON body or an RFC 7807 problem.

## Files

| File                | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `src/app.ts`        | Hono app (default export for Vercel) — routes, CORS, cache, rate limit |
| `src/server.ts`     | Local Node listener (`@hono/node-server`) only                         |
| `src/env.ts`        | `CORS_ORIGINS`, Upstash detection, API version                         |
| `src/cache.ts`      | 60s Upstash Redis triage cache (fail-open)                             |
| `src/rate-limit.ts` | Per-IP Upstash Ratelimit ~30/min (fail-open)                           |
| `.env.example`      | Env template                                                           |

## Endpoints

| Method | Path              | Description                                           |
| ------ | ----------------- | ----------------------------------------------------- |
| `GET`  | `/`               | Service info                                          |
| `GET`  | `/health`         | `{ ok, service, version }`                            |
| `GET`  | `/v1/triage?url=` | `200` + `TriageResult`, or `application/problem+json` |

Example:

```bash
pnpm --filter @savemytokens/api dev
curl "http://localhost:8787/v1/triage?url=https://example.com"
```

Default port: **8787** (override with `PORT`).

## Environment

| Variable                   | Purpose                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `PORT`                     | Local listen port (default `8787`) — not used on Vercel                                   |
| `CORS_ORIGINS`             | Comma-separated allowed origins (defaults include localhost + `https://savemytokens.dev`) |
| `UPSTASH_REDIS_REST_URL`   | Optional Redis for cache + rate limit                                                     |
| `UPSTASH_REDIS_REST_TOKEN` | Optional Redis token                                                                      |

Without Upstash credentials, rate limit and cache are skipped (fail-open) so local demos keep working.

Successful probes may include `X-Savemytokens-Cache: HIT|MISS`. Over limit returns `429` problem JSON.

## Deploy (Vercel)

Create a Vercel project with **Framework Preset: Hono** (native backend — `export default app` from `src/app.ts`):

- **Root Directory:** `apps/api`
- **Include files outside root directory in Build Step:** **on** (required — workspace packages live in `packages/*`)
- Install / Build are set in [`vercel.json`](./vercel.json) (`pnpm install` + build `types` then `core` from the monorepo root)
- Env: `CORS_ORIGINS`, Upstash URL/token (skip `PORT`)
- Node: pinned to `20.x` via `engines` (avoid `>=20`, which Vercel treats as auto-upgrade)

Do **not** use the old `api/` + `hono/vercel` `handle()` + catch-all rewrite pattern — it hangs under Vercel’s Hono backend runtime.

If the build logs `No projects matched the filters`, the monorepo root was not on the build path — confirm “include files outside root” and that `vercel.json` `buildCommand` runs from `../..`.

Live example host: `https://prunr-api.vercel.app` (custom `api.savemytokens.dev` later).

## Scripts

```bash
pnpm --filter @savemytokens/api dev
pnpm --filter @savemytokens/api build
pnpm --filter @savemytokens/api start
```

Depends on `@savemytokens/core` and `@savemytokens/types` via `workspace:*`.
