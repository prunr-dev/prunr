# `@prunr-dev/types`

Universal TypeScript contracts shared by every Prunr entry point. **No runtime probe logic and no framework dependencies** — only types, small helpers, and constants.

## Why this package exists

REST, MCP, and the web UI must agree on the shape of a triage response and API errors. Putting those contracts in one leaf package avoids drift and keeps `@prunr-dev/core` free to evolve behind a stable surface.

## Files

| File            | Purpose                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `src/triage.ts` | `TriageAction`, `TriageResult`, `ProbeSignals`, shield / llms.txt metadata |
| `src/errors.ts` | RFC 7807 `ProblemDetails`, `createProblemDetails`, `Problems` factories    |
| `src/index.ts`  | Public barrel re-exports                                                   |

## Key types

- **`TriageAction`** — recommended strategy (`USE_LLMS_TXT`, `FETCH_RAW`, `HEADLESS_REQUIRED`, `WAF_BLOCKED`, `ERROR_UNREACHABLE`).
- **`TriageResult`** — public response: URL, action, token-savings estimate, llms.txt discovery, shield telemetry, latency, reason.
- **`ProbeSignals`** — internal signals collected during a probe (headers, body snippet, error code) before synthesis.
- **`ProblemDetails`** — RFC 7807 error body for the HTTP API (`type`, `title`, `status`, optional `detail` / `code`).

## Usage

```ts
import type { TriageResult } from '@prunr-dev/types';
import { Problems, PROBLEM_JSON_MEDIA_TYPE } from '@prunr-dev/types';

const problem = Problems.invalidUrl('url query param is required');
// Content-Type: application/problem+json
```

## Scripts

```bash
pnpm --filter @prunr-dev/types build
pnpm --filter @prunr-dev/types typecheck
```

Built output lands in `dist/` and is what other workspace packages import.
