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
 * Vendor specificity (most specific wins):
 * `cloudflare_turnstile` > `datadome` > `cloudflare` > `unknown`
 *
 * Signals:
 * - Headers: `cf-ray`, `cf-mitigated`, `server: cloudflare`, `x-datadome`
 * - Cookies: `__cf_bm`, `cf_clearance`, `datadome`
 * - Body: Turnstile / "Just a moment…" / DataDome interstitial markers
 */
export function inspectShields(input: ShieldInspectionInput): ShieldTelemetry {
  const httpStatus = input.httpStatus ?? null;
  const headers = input.headers;
  const body = input.bodySnippet ?? '';
  const cookies = input.setCookie ?? [];
  const cookieBlob = cookies.join('\n').toLowerCase();
  const bodyLower = body.toLowerCase();

  const evidence: string[] = [];
  let hasCloudflare = false;
  let hasTurnstile = false;
  let hasDatadome = false;

  if (headers['cf-ray'] !== undefined) {
    evidence.push('cf-ray');
    hasCloudflare = true;
  }
  if (headers['cf-mitigated'] !== undefined) {
    evidence.push('cf-mitigated');
    hasCloudflare = true;
    hasTurnstile = true;
  }
  if ((headers['server'] ?? '').toLowerCase().includes('cloudflare')) {
    evidence.push('server:cloudflare');
    hasCloudflare = true;
  }
  if (headers['x-datadome'] !== undefined) {
    evidence.push('x-datadome');
    hasDatadome = true;
  }

  if (cookieNamePresent(cookieBlob, '__cf_bm')) {
    evidence.push('cookie:__cf_bm');
    hasCloudflare = true;
  }
  if (cookieNamePresent(cookieBlob, 'cf_clearance')) {
    evidence.push('cookie:cf_clearance');
    hasCloudflare = true;
  }
  if (cookieNamePresent(cookieBlob, 'datadome')) {
    evidence.push('cookie:datadome');
    hasDatadome = true;
  }

  if (/just a moment/i.test(body)) {
    evidence.push('body:just-a-moment');
    hasCloudflare = true;
    hasTurnstile = true;
  }
  if (
    /challenges\.cloudflare\.com|turnstile|cf-turnstile/i.test(bodyLower)
  ) {
    evidence.push('body:turnstile');
    hasCloudflare = true;
    hasTurnstile = true;
  }
  if (/datadome|dd\.js|c\.datadome\.co/i.test(bodyLower)) {
    evidence.push('body:datadome');
    hasDatadome = true;
  }

  let vendor: ShieldVendor | null = null;
  if (hasTurnstile) {
    vendor = 'cloudflare_turnstile';
  } else if (hasDatadome) {
    vendor = 'datadome';
  } else if (hasCloudflare) {
    vendor = 'cloudflare';
  } else if (
    (httpStatus === 403 || httpStatus === 429) &&
    looksLikeChallengeBody(bodyLower)
  ) {
    vendor = 'unknown';
    evidence.push('body:challenge-like');
  }

  const detected = vendor !== null;

  return {
    detected,
    vendor,
    evidence: detected ? evidence : [],
    httpStatus,
  };
}

function cookieNamePresent(cookieBlob: string, name: string): boolean {
  // Match cookie name at start of a Set-Cookie line or after separators.
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
