# `@savemytokens/web`

Next.js + Tailwind + **shadcn/ui** (Radix) diagnostic visualizer for [savemytokens.dev](https://savemytokens.dev). Corduroy-themed dark UI for pasting a URL, calling the REST API, and inspecting a `TriageResult` — including a token-estimate chart on results.

## Why this app exists

Operators and agent authors need a quick UI to see what savemytokens would recommend — without wiring MCP or curling by hand.

## Files

| Path                            | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `src/app/layout.tsx`            | Root shell, fonts, `className="dark"`             |
| `src/app/page.tsx`              | Brand-forward triage workspace                    |
| `src/app/globals.css`           | Tailwind 4 + shadcn tokens (corduroy) + motion    |
| `src/components/TriageForm.tsx` | Form, presets, `?url=` sync, result card + chart  |
| `src/components/ui/*`           | shadcn primitives (button, input, card, chart, …) |
| `src/lib/api.ts`                | Fetch helper + env-based API base URL             |
| `src/lib/presets.ts`            | Demo URL chips (labels may drift vs live sites)   |
| `components.json`               | shadcn config (`--base radix`)                    |
| `next.config.ts`                | `transpilePackages: ['@savemytokens/types']`      |
| `.env.example`                  | `NEXT_PUBLIC_SAVEMYTOKENS_API_URL`                |

## Theme

Corduroy dark palette is mapped onto shadcn CSS variables (`--background`, `--primary`, `--chart-*`, …). Fonts: **Space Mono** (display/mono) + **Nunito** (body) via `next/font`.

## How it talks to the engine

```text
Browser → GET {API}/v1/triage?url=… → @savemytokens/api → @savemytokens/core
```

This app depends on `@savemytokens/types` only (for typing). It does **not** import `@savemytokens/core` in the browser.

```bash
# apps/web/.env.local
NEXT_PUBLIC_SAVEMYTOKENS_API_URL=http://localhost:8787
```

Production example: `NEXT_PUBLIC_SAVEMYTOKENS_API_URL=https://api.savemytokens.dev`.

Shareable demos use `?url=` (auto-runs once on load).

## Deploy (Vercel)

- **Root Directory:** `apps/web`
- Set `NEXT_PUBLIC_SAVEMYTOKENS_API_URL` to the hosted API
- Ensure the API `CORS_ORIGINS` includes `https://savemytokens.dev`

## Scripts

```bash
# terminal 1
pnpm --filter @savemytokens/api dev

# terminal 2
pnpm --filter @savemytokens/web dev
```

Open http://localhost:3000
