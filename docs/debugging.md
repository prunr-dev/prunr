# Debugging Prunr

How to step through Prunr in the Cursor / VS Code debugger.

Most of the interesting logic lives in `@prunr-dev/core` (`probeUrl`). The API and MCP apps are thin wrappers. Prefer debugging the **API** path — same engine as production, easy to trigger with `curl`.

## Prerequisites

```bash
pnpm install
pnpm --filter @prunr-dev/types build
pnpm --filter @prunr-dev/core build
```

`@prunr-dev/core` and `@prunr-dev/types` export from `dist/`. Rebuild them after editing those packages, or your breakpoints and runtime will disagree.

Source maps are enabled in `tsconfig.base.json` (`sourceMap` + `declarationMap`), so the debugger can map `packages/core/dist/*.js` back to `packages/core/src/*.ts`.

## Recommended: debug the API (hits core)

### 1. Use the repo launch configs

`.vscode/launch.json` already defines:

| Config | Use |
| ------ | --- |
| **Debug API** | Best default — Hono on `:8787`, steps into `@prunr-dev/core` |
| **Debug core tests** | All `packages/core` unit tests under the debugger |
| **Debug single core test file** | Focused file in the editor (e.g. `probe.test.ts`) then F5 |
| **Attach Node** | Attach to a process started with `--inspect` / `--inspect-brk` on `9229` |
| **Debug Web (Next.js)** | Browser-side UI only (probes still run in the API) |

### 2. Set breakpoints

Useful stop points for a full triage:

| Order | File | Why |
| ----- | ---- | --- |
| 1 | `apps/api/src/app.ts` — `GET /v1/triage` handler | Request entry, query parsing, rate limit / cache |
| 2 | `packages/core/src/probe.ts` — `probeUrl` | Decision pipeline orchestration |
| 3 | `packages/core/src/ssrf.ts` — `validateProbeTarget` | Protocol / private-IP rejection |
| 4 | `packages/core/src/fetch-origin.ts` — `fetchOrigin` | Origin GET + body cap |
| 5 | `packages/core/src/llms-txt.ts` — `discoverLlmsTxt` | `/llms.txt` discovery |
| 6 | `packages/core/src/shields.ts` — `inspectShields` | WAF heuristics |
| 7 | `packages/core/src/spa.ts` — `looksLikeSpaShell` | Empty hydration shell |
| 8 | `packages/core/src/probe.ts` — `synthesizeAction` | Final `TriageAction` pick |

### 3. Start debugging

1. Run **Debug API** from the Run and Debug panel (or `F5` with that config selected).
2. Wait for `@prunr-dev/api listening on http://localhost:8787`.
3. In a separate terminal:

```bash
curl "http://localhost:8787/v1/triage?url=https://example.com"
```

The debugger should stop on your breakpoints. Step Over / Into / Out as usual.

### Optional: web UI as the client

With the API under the debugger:

```bash
cp apps/web/.env.example apps/web/.env.local   # if needed
pnpm --filter @prunr-dev/web dev
```

Open [http://localhost:3000](http://localhost:3000), submit a URL — the browser hits the same debug session on `:8787`.

---

## Gotcha: the 2s probe timeout

`probeUrl` uses `AbortSignal.timeout(2000)`. If you pause **inside** the parallel fetch work (`fetchOrigin` / `discoverLlmsTxt`) for longer than ~2s, those requests abort and you may see `ERROR_UNREACHABLE` or incomplete shield data.

Workarounds while stepping:

- Break **after** `Promise.all` returns (e.g. on `inspectShields` / `synthesizeAction`), not mid-fetch.
- Or break only in `apps/api/src/app.ts` and step into `probeUrl` once network work is done.
- Or temporarily raise `PROBE_TIMEOUT_MS` in `packages/core/src/probe.ts` for a local session (do not commit).

---

## Gotcha: cache skips the probe

If Upstash env vars are set (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`), a cache **HIT** returns before `probeUrl`. You will not hit core breakpoints.

For local stepping, either unset those vars (cache/rate-limit fail open and are skipped) or use a unique URL each time.

---

## Debugging core without the API

### Via unit tests (best for heuristics)

Use **Debug core tests** or **Debug single core test file**, and set breakpoints in `probe.ts`, `shields.ts`, `ssrf.ts`, etc.

Tests already inject fake `fetch` / DNS — no network required, and no 2s abort while you step (unless a test uses real timers).

```bash
# CLI equivalent (no debugger)
pnpm --filter @prunr-dev/core test
```

### Via a one-off script

```bash
pnpm --filter @prunr-dev/core exec tsx --inspect-brk -e "
  import { probeUrl } from './src/index.ts';
  const r = await probeUrl('https://example.com');
  console.log(r);
"
```

Then use **Attach to Node Process** (or add an attach config on port `9229`) and continue.

For a cleaner attach config:

```json
{
  "name": "Attach Node",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "restart": true,
  "skipFiles": ["<node_internals>/**"]
}
```

---

## Debugging the MCP server

MCP uses **stdio**. Attaching a debugger while Cursor also owns that stdio pipe is awkward.

Practical options:

1. **Prefer the API** — same `probeUrl` call path.
2. **Debug MCP in isolation** with inspect, then invoke the tool from a second MCP client / test harness — not from the same Cursor session that is debugging.
3. After build, launch with inspect and attach:

```bash
pnpm --filter @prunr-dev/mcp build
node --inspect-brk apps/mcp/dist/index.js
```

Breakpoints in `apps/mcp/src` map via source maps from `dist/`. Tool handling lives in `apps/mcp/src/server.ts`.

---

## Debugging Next.js (`apps/web`)

The web app only fetches the API; it does not run probes. Use the built-in JavaScript debugger:

1. Start `pnpm --filter @prunr-dev/web dev` (and the API separately, or under **Debug API**).
2. Open the Command Palette → **Debug: JavaScript Debug Terminal**, or use a Next.js launch config.
3. Set breakpoints in `apps/web/src/lib/api.ts` (client fetch) or Server Components as needed.

Example launch config:

```json
{
  "name": "Debug Web (Next.js)",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["--filter", "@prunr-dev/web", "dev"],
  "cwd": "${workspaceFolder}",
  "console": "integratedTerminal",
  "serverReadyAction": {
    "action": "debugWithChrome",
    "pattern": "- Local:.+(https?://.+)",
    "uriFormat": "%s",
    "webRoot": "${workspaceFolder}/apps/web"
  }
}
```

For triage logic itself, stay on **Debug API** + core breakpoints.

---

## CLI-only (no IDE)

```bash
# API with inspector — then attach from Cursor on port 9229
pnpm --filter @prunr-dev/api exec node --import tsx --inspect-brk src/index.ts

# Or after build
pnpm --filter @prunr-dev/api build
node --inspect-brk apps/api/dist/index.js
```

In another terminal, `curl` as above once the process is listening (press Continue in the debugger first if you used `--inspect-brk`).

---

## Quick checklist

1. Build `types` + `core`.
2. Launch **Debug API**.
3. Breakpoint on `probeUrl` and/or `synthesizeAction`.
4. `curl` a public HTTPS URL.
5. Avoid long pauses inside the parallel fetches (2s budget).
6. After editing core/types, rebuild before the next session.
