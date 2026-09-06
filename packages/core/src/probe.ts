import type {
  LlmsTxtDiscovery,
  ShieldTelemetry,
  TriageAction,
  TriageResult,
} from '@prunr-dev/types';

import {
  fetchOrigin,
  type FetchOriginOptions,
  type OriginFetchResult,
} from './fetch-origin.js';
import { discoverLlmsTxt, emptyLlmsTxtDiscovery } from './llms-txt.js';
import { emptyShieldTelemetry, inspectShields } from './shields.js';
import { looksLikeSpaShell } from './spa.js';
import {
  validateProbeTarget,
  type ValidateProbeTargetOptions,
} from './ssrf.js';

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

export interface ProbeUrlOptions
  extends ValidateProbeTargetOptions, FetchOriginOptions {
  /** Override wall-clock start for deterministic tests. */
  now?: () => number;
}

/**
 * Probes a URL and returns a {@link TriageResult}.
 *
 * ## Execution pipeline
 *
 * **Step A — SSRF & protocol** (`ssrf.ts`)
 * Validate HTTP/HTTPS, DNS-resolve, reject private / metadata targets.
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
 * Priority: `ERROR_UNREACHABLE` → `WAF_BLOCKED` → `USE_LLMS_TXT` →
 * `HEADLESS_REQUIRED` → `FETCH_RAW`.
 *
 * @param input - Absolute or absolute-resolvable URL string
 * @param options - Optional fetch/DNS overrides for tests
 */
export async function probeUrl(
  input: string,
  options?: ProbeUrlOptions,
): Promise<TriageResult> {
  const clock = options?.now ?? Date.now;
  const started = clock();
  const probedAt = new Date().toISOString();

  // Step A
  const ssrf = await validateProbeTarget(input, { lookup: options?.lookup });
  if (!ssrf.ok) {
    return buildResult({
      url: input,
      action: 'ERROR_UNREACHABLE',
      reason: ssrf.reason,
      latencyMs: clock() - started,
      probedAt,
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: emptyShieldTelemetry(),
    });
  }

  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  const fetchOpts = { fetch: options?.fetch };

  // Step B — parallel origin + llms.txt under one budget.
  const [originResult, llmsTxt] = await Promise.all([
    fetchOrigin(ssrf.url, signal, fetchOpts),
    discoverLlmsTxt(ssrf.url, signal, fetchOpts),
  ]);

  // Step C
  const shields = originResult.ok
    ? inspectShields({
        headers: originResult.headers,
        setCookie: originResult.setCookie,
        bodySnippet: originResult.bodySnippet,
        httpStatus: originResult.status,
      })
    : emptyShieldTelemetry();

  // Step D
  const decision = synthesizeAction({
    originResult,
    llmsTxt,
    shields,
  });

  return buildResult({
    url: originResult.ok ? originResult.finalUrl : ssrf.url.toString(),
    action: decision.action,
    reason: decision.reason,
    latencyMs: clock() - started,
    probedAt,
    llmsTxt,
    shields,
  });
}

/**
 * Pure synthesis helper (exported for unit tests).
 */
export function synthesizeAction(input: {
  originResult: OriginFetchResult;
  llmsTxt: LlmsTxtDiscovery;
  shields: ShieldTelemetry;
}): { action: TriageAction; reason: string } {
  const { originResult, llmsTxt, shields } = input;

  // Unreachable only when we have no usable origin response and no llms.txt.
  if (!originResult.ok && !llmsTxt.found) {
    return {
      action: 'ERROR_UNREACHABLE',
      reason: originResult.reason,
    };
  }

  if (shields.detected) {
    const vendor = shields.vendor ?? 'unknown';
    return {
      action: 'WAF_BLOCKED',
      reason: `Bot shield detected (${vendor}): ${shields.evidence.join(', ') || 'challenge response'}.`,
    };
  }

  if (llmsTxt.found) {
    return {
      action: 'USE_LLMS_TXT',
      reason: `Author-curated Markdown found at ${llmsTxt.path ?? 'llms.txt'}.`,
    };
  }

  if (originResult.ok) {
    if (looksLikeSpaShell(originResult.bodySnippet, originResult.contentType)) {
      return {
        action: 'HEADLESS_REQUIRED',
        reason: 'Origin HTML looks like an empty client-side hydration shell.',
      };
    }

    return {
      action: 'FETCH_RAW',
      reason: 'Origin returned static-looking HTML without bot shields.',
    };
  }

  // Origin failed but llms.txt was found — already handled above via USE_LLMS_TXT.
  // Keep a defensive fallback.
  return {
    action: 'ERROR_UNREACHABLE',
    reason: originResult.reason,
  };
}

function buildResult(args: {
  url: string;
  action: TriageAction;
  reason: string;
  latencyMs: number;
  probedAt: string;
  llmsTxt: LlmsTxtDiscovery;
  shields: ShieldTelemetry;
}): TriageResult {
  return {
    url: args.url,
    action: args.action,
    estimatedTokenSavingsPercent: TOKEN_SAVINGS_BY_ACTION[args.action],
    llmsTxt: args.llmsTxt,
    shields: args.shields,
    latencyMs: args.latencyMs,
    reason: args.reason,
    probedAt: args.probedAt,
  };
}
