import type {
  LlmsTxtDiscovery,
  ShieldTelemetry,
  TriageResult,
} from '@prunr-dev/types';

import { discoverLlmsTxt, emptyLlmsTxtDiscovery } from './llms-txt.js';
import { emptyShieldTelemetry } from './shields.js';
import { validateProbeTarget } from './ssrf.js';

/** Default per-request timeout budget for all outbound probes. */
export const PROBE_TIMEOUT_MS = 2000 as const;

/**
 * Heuristic token-savings defaults by recommended action (tunable later).
 */
export const TOKEN_SAVINGS_BY_ACTION = {
  USE_LLMS_TXT: 85,
  FETCH_RAW: 40,
  HEADLESS_REQUIRED: 10,
  WAF_BLOCKED: 0,
  ERROR_UNREACHABLE: 0,
} as const satisfies Record<TriageResult['action'], number>;

/**
 * Probes a URL and returns a {@link TriageResult}.
 *
 * ## Execution pipeline
 *
 * **Step A — SSRF & protocol** (`ssrf.ts`)
 * Validate HTTP/HTTPS, reject private / metadata targets (fail closed).
 *
 * **Step B — Parallel discovery** (`llms-txt.ts` + origin fetch)
 * Within {@link PROBE_TIMEOUT_MS}, probe the origin and llms.txt paths.
 *
 * **Step C — Shield heuristics** (`shields.ts`)
 * Inspect headers, cookies, and a capped body snippet for WAF markers.
 *
 * **Step D — Synthesize**
 * Apply action priority and fill savings / reason / latency metadata.
 *
 * @param input - Absolute or absolute-resolvable URL string
 *
 * @remarks
 * Phase 1: Steps B–D are stubbed. SSRF performs basic host checks.
 * Returns `ERROR_UNREACHABLE` with an explicit stub reason so apps can
 * integrate against a stable signature before live networking lands.
 */
export async function probeUrl(input: string): Promise<TriageResult> {
  const started = Date.now();
  const probedAt = new Date().toISOString();

  // Step A
  const ssrf = await validateProbeTarget(input);
  if (!ssrf.ok) {
    return unreachableResult({
      url: input,
      reason: ssrf.reason,
      latencyMs: Date.now() - started,
      probedAt,
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: emptyShieldTelemetry(),
    });
  }

  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);

  // Step B (stub) — llms.txt discovery only; origin fetch TBD in Phase 2.
  const llmsTxt = await discoverLlmsTxt(ssrf.url, signal);

  // Step C (stub) — no origin headers yet.
  const shields = emptyShieldTelemetry();

  // Step D — Phase 1 always reports unreachable until live probes exist.
  return unreachableResult({
    url: ssrf.url.toString(),
    reason:
      'Probe engine stub: live network checks are not implemented yet (Phase 1).',
    latencyMs: Date.now() - started,
    probedAt,
    llmsTxt,
    shields,
  });
}

function unreachableResult(args: {
  url: string;
  reason: string;
  latencyMs: number;
  probedAt: string;
  llmsTxt: LlmsTxtDiscovery;
  shields: ShieldTelemetry;
}): TriageResult {
  return {
    url: args.url,
    action: 'ERROR_UNREACHABLE',
    estimatedTokenSavingsPercent: TOKEN_SAVINGS_BY_ACTION.ERROR_UNREACHABLE,
    llmsTxt: args.llmsTxt,
    shields: args.shields,
    latencyMs: args.latencyMs,
    reason: args.reason,
    probedAt: args.probedAt,
  };
}
