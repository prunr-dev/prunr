import type { ProbeErrorCode } from '@prunr-dev/types';

/**
 * Outcome of Step A (SSRF / protocol sanitation).
 */
export type SsrfValidationResult =
  | { ok: true; url: URL }
  | { ok: false; code: ProbeErrorCode; reason: string };

/**
 * Parses and sanitizes a candidate URL for probing.
 *
 * Rules (to be fully enforced in Phase 2):
 * - Protocol must be `http:` or `https:` only.
 * - Host must not be `localhost` / `*.local`.
 * - Resolved addresses must not be loopback, RFC1918, link-local,
 *   IPv6 ULA, or cloud metadata (`169.254.169.254`).
 *
 * @param input - Raw URL string from an agent or API caller
 * @returns Normalized `URL` on success, or a fail-closed error code
 *
 * @remarks
 * Phase 1 stub: performs protocol + basic hostname checks only.
 * DNS resolution and IP-range blocking are not yet implemented.
 */
export async function validateProbeTarget(
  input: string,
): Promise<SsrfValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return {
      ok: false,
      code: 'INVALID_URL',
      reason: 'URL could not be parsed.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      code: 'SSRF_BLOCKED',
      reason: 'Only http and https protocols are allowed.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host === '169.254.169.254'
  ) {
    return {
      ok: false,
      code: 'SSRF_BLOCKED',
      reason: 'Target host is disallowed (loopback, local, or metadata).',
    };
  }

  // TODO(phase-2): dns.lookup / resolve4+resolve6 and block private ranges.
  return { ok: true, url: parsed };
}
