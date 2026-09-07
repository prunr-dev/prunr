# Prunr

Ultra-fast pre-flight triage for AI web agents.

Before an agent fetches a URL, Prunr inspects it in under ~100ms and recommends the cheapest, fastest way to get the content:

| Action              | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| `USE_LLMS_TXT`      | Domain publishes curated Markdown — skip HTML crawl    |
| `FETCH_RAW`         | Static HTML, no bot wall — plain HTTP GET is enough    |
| `HEADLESS_REQUIRED` | Empty SPA shell — needs a browser engine               |
| `WAF_BLOCKED`       | Edge bot shield detected — abort or route to unblocker |
| `ERROR_UNREACHABLE` | Timeout, DNS failure, SSRF block, or network error     |

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

See [docs/architecture.md](docs/architecture.md) for how data flows between packages, [docs/eli5.md](docs/eli5.md) for a plain-language walkthrough, or [docs/debugging.md](docs/debugging.md) to step through the API and core in the debugger.

### Root config files

| File                  | Purpose                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Declares `packages/*` and `apps/*` as workspace members                                 |
| `package.json`        | Private root; `pnpm build` / `dev` / `lint` / `test` / `typecheck` / `format` via Turbo |
| `tsconfig.base.json`  | Strict shared TypeScript settings (NodeNext ESM)                                        |
| `turbo.json`          | Task graph and cache outputs across the monorepo                                        |
| `.prettierrc.json`    | Shared Prettier formatting                                                              |
| `.npmrc`              | pnpm peer-dependency defaults                                                           |
| `.cursorrules`        | Project mission and coding constraints for AI assistants                                |

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

**Phase 3 public MVP:** live probes in `@prunr-dev/core`, Corduroy/daisyUI visualizer in `@prunr-dev/web`, and a hostable Hono API with env-driven CORS plus optional Upstash rate limit (30/min) and 60s response cache.

### Try it

```bash
# Hosted (once deployed)
curl "https://api.prunr.dev/v1/triage?url=https://example.com"

# Local
pnpm --filter @prunr-dev/api dev
curl "http://localhost:8787/v1/triage?url=https://example.com"
```

Visualizer: [prunr.dev](https://prunr.dev) (or `pnpm --filter @prunr-dev/web dev` against a local API).

### Deploy (Vercel monorepo)

Two projects from the same repo:

| Project | Root Directory | Key env                                                             |
| ------- | -------------- | ------------------------------------------------------------------- |
| Web     | `apps/web`     | `NEXT_PUBLIC_PRUNR_API_URL=https://api.prunr.dev`                   |
| API     | `apps/api`     | `CORS_ORIGINS=https://prunr.dev,...` · Upstash Redis REST URL/token |

Enable “include files outside root directory” so workspace packages resolve. See [`apps/api/README.md`](apps/api/README.md) and [`apps/web/README.md`](apps/web/README.md).

MCP remains **local stdio** for IDE agents; for a zero-install try, call the hosted REST API instead.
