import type { ShieldTelemetry, ShieldVendor } from '@prunr-dev/types';

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
 * **`detected` is challenge-grade only.** CDN fronting (`cf-ray`,
 * `server: cloudflare`, `__cf_bm` alone) is recorded as `cdn:*` evidence with
 * `detected: false` so synthesis does not abort on Cloudflare-as-CDN.
 *
 * Challenge signals:
 * - `cf-mitigated`, Turnstile / “Just a moment…”, DataDome markers
 * - `403`/`429` + challenge-like body
 * - `cf_clearance` only with challenge context (not alone on 200)
 *
 * Vendor specificity when detected:
 * `cloudflare_turnstile` > `datadome` > `cloudflare` > `unknown`
 */
export function inspectShields(input: ShieldInspectionInput): ShieldTelemetry {
  const httpStatus = input.httpStatus ?? null;
  const headers = input.headers;
  const body = input.bodySnippet ?? '';
  const cookies = input.setCookie ?? [];
  const cookieBlob = cookies.join('\n').toLowerCase();
  const bodyLower = body.toLowerCase();

  const cdnEvidence: string[] = [];
  const challengeEvidence: string[] = [];
  let hasTurnstile = false;
  let hasDatadome = false;
  let hasCloudflareChallenge = false;

  // --- CDN-only markers (informational unless paired with a challenge) ---
  if (headers['cf-ray'] !== undefined) {
    cdnEvidence.push('cdn:cf-ray');
  }
  if ((headers['server'] ?? '').toLowerCase().includes('cloudflare')) {
    cdnEvidence.push('cdn:server:cloudflare');
  }
  if (cookieNamePresent(cookieBlob, '__cf_bm')) {
    cdnEvidence.push('cdn:cookie:__cf_bm');
  }

  // --- Challenge-grade signals ---
  if (headers['cf-mitigated'] !== undefined) {
    challengeEvidence.push('cf-mitigated');
    hasCloudflareChallenge = true;
    hasTurnstile = true;
  }
  if (headers['x-datadome'] !== undefined) {
    challengeEvidence.push('x-datadome');
    hasDatadome = true;
  }
  if (cookieNamePresent(cookieBlob, 'datadome')) {
    challengeEvidence.push('cookie:datadome');
    hasDatadome = true;
  }

  const hasJustAMoment = /just a moment/i.test(body);
  const hasTurnstileBody =
    /challenges\.cloudflare\.com|turnstile|cf-turnstile/i.test(bodyLower);
  if (hasJustAMoment) {
    challengeEvidence.push('body:just-a-moment');
    hasCloudflareChallenge = true;
    hasTurnstile = true;
  }
  if (hasTurnstileBody) {
    challengeEvidence.push('body:turnstile');
    hasCloudflareChallenge = true;
    hasTurnstile = true;
  }
  if (/datadome|dd\.js|c\.datadome\.co/i.test(bodyLower)) {
    challengeEvidence.push('body:datadome');
    hasDatadome = true;
  }

  const hasCfClearance = cookieNamePresent(cookieBlob, 'cf_clearance');
  const challengeContext =
    hasCloudflareChallenge ||
    hasTurnstile ||
    httpStatus === 403 ||
    httpStatus === 429;
  if (hasCfClearance && challengeContext) {
    challengeEvidence.push('cookie:cf_clearance');
    hasCloudflareChallenge = true;
  }

  const unknownChallenge =
    (httpStatus === 403 || httpStatus === 429) &&
    looksLikeChallengeBody(bodyLower) &&
    !hasTurnstile &&
    !hasDatadome &&
    !hasCloudflareChallenge;

  let vendor: ShieldVendor | null = null;
  if (hasTurnstile) {
    vendor = 'cloudflare_turnstile';
  } else if (hasDatadome) {
    vendor = 'datadome';
  } else if (hasCloudflareChallenge) {
    vendor = 'cloudflare';
  } else if (unknownChallenge) {
    vendor = 'unknown';
    challengeEvidence.push('body:challenge-like');
  }

  const detected = vendor !== null;
  const evidence = detected
    ? [...challengeEvidence, ...cdnEvidence]
    : [...cdnEvidence];

  return {
    detected,
    vendor: detected ? vendor : null,
    evidence,
    httpStatus,
  };
}

function cookieNamePresent(cookieBlob: string, name: string): boolean {
  const re = new RegExp(
    `(?:^|[\\n;,\\s])${escapeRegExp(name.toLowerCase())}=`,
    'i',
  );
  return re.test(cookieBlob);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function looksLikeChallengeBody(bodyLower: string): boolean {
  if (bodyLower.length === 0) {
    return false;
  }
  return (
    bodyLower.includes('captcha') ||
    bodyLower.includes('challenge') ||
    bodyLower.includes('access denied') ||
    bodyLower.includes('attention required') ||
    bodyLower.includes('verify you are human')
  );
}
