import type { ShieldTelemetry } from '@prunr-dev/types';

/**
 * Empty shield telemetry when no origin response was available.
 */
export function emptyShieldTelemetry(): ShieldTelemetry {
  return {
    detected: false,
    vendor: null,
    evidence: [],
    httpStatus: null,
  };
}

export interface ShieldInspectionInput {
  /** Lowercased header map from the origin response. */
  headers: Record<string, string>;
  /** Raw `set-cookie` values if available. */
  setCookie?: string[];
  /** First ~4KB of response body for challenge-page sniffing. */
  bodySnippet?: string | null;
  httpStatus?: number | null;
}

/**
 * Passive bot-shield / WAF detection from headers, cookies, and body snippet.
 *
 * Signals of interest (Phase 2):
 * - Headers: `cf-ray`, `cf-mitigated`, `server: cloudflare`, `x-datadome`
 * - Cookies: `__cf_bm`, `cf_clearance`, `datadome`
 * - Body: Turnstile / "Just a moment…" / DataDome interstitial markers
 *
 * @remarks Phase 1 stub returns {@link emptyShieldTelemetry} with status only.
 */
export function inspectShields(input: ShieldInspectionInput): ShieldTelemetry {
  // TODO(phase-2): implement header/cookie/body heuristics.
  return {
    ...emptyShieldTelemetry(),
    httpStatus: input.httpStatus ?? null,
  };
}
