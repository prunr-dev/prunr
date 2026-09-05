# Prunr

Ultra-fast pre-flight triage for AI web agents.

Before an agent fetches a URL, Prunr inspects it in under ~100ms and recommends the cheapest, fastest way to get the content:

| Action | Meaning |
| --- | --- |
| `USE_LLMS_TXT` | Domain publishes curated Markdown — skip HTML crawl |
| `FETCH_RAW` | Static HTML, no bot wall — plain HTTP GET is enough |
| `HEADLESS_REQUIRED` | Empty SPA shell — needs a browser engine |
| `WAF_BLOCKED` | Edge bot shield detected — abort or route to unblocker |
| `ERROR_UNREACHABLE` | Timeout, DNS failure, SSRF block, or network error |

**Org:** [`prunr-dev`](https://github.com/prunr-dev) · **Repo:** [prunr-dev/prunr](https://github.com/prunr-dev/prunr) · **Site:** [prunr.dev](https://prunr.dev)

## Monorepo layout

This repo is a **pnpm + Turborepo** workspace. Shared logic lives in `packages/`; runnable entry points live in `apps/`. Packages link locally via `workspace:*` (no npm publish required for development).

```text
prunr/
├── packages/
│   ├── types/    @prunr-dev/types   — shared TypeScript contracts
│   └── core/     @prunr-dev/core    — pure probe engine (no HTTP frameworks)
├── apps/
│   ├── api/      @prunr-dev/api     — REST microservice (Hono)
│   ├── mcp/      @prunr-dev/mcp     — Model Context Protocol server
│   └── web/      @prunr-dev/web     — Next.js visualizer (prunr.dev)
├── docs/         High-level architecture notes
├── package.json  Root scripts (turbo)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

See [docs/architecture.md](docs/architecture.md) for how data flows between packages.

### Root config files

| File | Purpose |
| --- | --- |
| `pnpm-workspace.yaml` | Declares `packages/*` and `apps/*` as workspace members |
| `package.json` | Private root; `pnpm build` / `dev` / `lint` / `test` / `typecheck` via Turbo |
| `tsconfig.base.json` | Strict shared TypeScript settings (NodeNext ESM) |
| `turbo.json` | Task graph and cache outputs across the monorepo |
| `.npmrc` | pnpm peer-dependency defaults |
| `.cursorrules` | Project mission and coding constraints for AI assistants |

## Getting started

Requires **Node.js 20+** and **pnpm 10+**.

```bash
pnpm install
pnpm build        # build all packages (types → core → apps)
pnpm typecheck    # typecheck the workspace
pnpm dev          # run all persistent dev tasks
```

Filter a single package:

```bash
pnpm --filter @prunr-dev/types build
pnpm --filter @prunr-dev/core typecheck
```

## Package docs

- [`packages/types`](packages/types/README.md) — `TriageResult`, shield telemetry, RFC 7807 errors
- [`packages/core`](packages/core/README.md) — SSRF guards, probes, action synthesis
- [`apps/api`](apps/api/README.md) — REST `GET /v1/triage`
- [`apps/mcp`](apps/mcp/README.md) — MCP `triage_url` tool
- [`apps/web`](apps/web/README.md) — Next.js diagnostic visualizer

## Status

Phase 1 foundation complete: monorepo, shared contracts, core probe stubs, API, MCP, and web visualizer scaffolds. Live network probing lands next.
