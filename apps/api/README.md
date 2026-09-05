# `@prunr-dev/api`

Public **REST microservice** for Prunr triage. Thin Hono layer over `@prunr-dev/core` — no probe logic lives here.

## Why this app exists

Agents and the web UI need a simple HTTP surface. This app validates input, calls `probeUrl()`, and returns either a `TriageResult` JSON body or an RFC 7807 problem.

## Files

| File | Purpose |
| --- | --- |
| `src/app.ts` | Hono routes (`/health`, `/v1/triage`) and problem mapping |
| `src/index.ts` | Node server entry (`@hono/node-server`) |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness — `{ ok: true, service: "prunr-api" }` |
| `GET` | `/v1/triage?url=` | Runs triage; `200` + `TriageResult`, or `application/problem+json` |

Example:

```bash
pnpm --filter @prunr-dev/api dev
curl "http://localhost:8787/v1/triage?url=https://example.com"
```

Default port: **8787** (override with `PORT`).

## Scripts

```bash
pnpm --filter @prunr-dev/api dev
pnpm --filter @prunr-dev/api build
pnpm --filter @prunr-dev/api start
```

Depends on `@prunr-dev/core` and `@prunr-dev/types` via `workspace:*`.
