# `@prunr-dev/web`

Next.js + Tailwind + **daisyUI** diagnostic visualizer for [prunr.dev](https://prunr.dev). Corduroy-themed UI for pasting a URL, calling the REST API, and inspecting a `TriageResult`.

## Why this app exists

Operators and agent authors need a quick UI to see what Prunr would recommend — without wiring MCP or curling by hand.

## Files

| Path | Purpose |
| --- | --- |
| `src/app/layout.tsx` | Root shell, fonts, `data-theme="corduroy"` |
| `src/app/page.tsx` | Brand-forward triage workspace |
| `src/app/globals.css` | Tailwind 4 + daisyUI + Corduroy theme + motion |
| `src/components/TriageForm.tsx` | Form, presets, `?url=` sync, result panel |
| `src/lib/api.ts` | Fetch helper + env-based API base URL |
| `src/lib/presets.ts` | Demo URL chips (labels may drift vs live sites) |
| `next.config.ts` | `transpilePackages: ['@prunr-dev/types']` |
| `.env.example` | `NEXT_PUBLIC_PRUNR_API_URL` |

## Theme

Custom daisyUI theme **`corduroy`** maps the Corduroy editor palette (`base` / `rayon` / `argyle` / `chenille` / …) onto daisy semantic tokens. Fonts: **Syne** (display) + **IBM Plex Mono** (labels/code).

## How it talks to the engine

```text
Browser → GET {API}/v1/triage?url=… → @prunr-dev/api → @prunr-dev/core
```

This app depends on `@prunr-dev/types` only (for typing). It does **not** import `@prunr-dev/core` in the browser.

```bash
# apps/web/.env.local
NEXT_PUBLIC_PRUNR_API_URL=http://localhost:8787
```

Production example: `NEXT_PUBLIC_PRUNR_API_URL=https://api.prunr.dev`.

Shareable demos use `?url=` (auto-runs once on load).

## Deploy (Vercel)

- **Root Directory:** `apps/web`
- Set `NEXT_PUBLIC_PRUNR_API_URL` to the hosted API
- Ensure the API `CORS_ORIGINS` includes `https://prunr.dev`

## Scripts

```bash
# terminal 1
pnpm --filter @prunr-dev/api dev

# terminal 2
pnpm --filter @prunr-dev/web dev
```

Open http://localhost:3000
