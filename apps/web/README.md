# `@prunr-dev/web`

Next.js + Tailwind **diagnostic visualizer** for [prunr.dev](https://prunr.dev). Lets humans paste a URL, call the REST API, and inspect a `TriageResult`.

## Why this app exists

Operators and agent authors need a quick UI to see what Prunr would recommend — without wiring MCP or curling by hand.

## Files

| Path | Purpose |
| --- | --- |
| `src/app/layout.tsx` | Root shell, fonts, metadata |
| `src/app/page.tsx` | Landing / triage workspace |
| `src/app/globals.css` | Tailwind + design tokens |
| `src/components/TriageForm.tsx` | Client form that calls the API |
| `src/lib/api.ts` | Fetch helper + env-based API base URL |
| `next.config.ts` | `transpilePackages: ['@prunr-dev/types']` |

## How it talks to the engine

```text
Browser → GET {API}/v1/triage?url=… → @prunr-dev/api → @prunr-dev/core
```

This app depends on `@prunr-dev/types` only (for typing). It does **not** import `@prunr-dev/core` in the browser.

Set the API base URL:

```bash
# apps/web/.env.local
NEXT_PUBLIC_PRUNR_API_URL=http://localhost:8787
```

## Scripts

```bash
# terminal 1
pnpm --filter @prunr-dev/api dev

# terminal 2
pnpm --filter @prunr-dev/web dev
```

Open http://localhost:3000
