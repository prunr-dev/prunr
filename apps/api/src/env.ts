/** API package version surfaced on `/health`. */
export const API_VERSION = '0.0.0' as const;

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://savemytokens.dev',
  'https://www.savemytokens.dev',
] as const;

/**
 * Parses `CORS_ORIGINS` (comma-separated) or returns local + production defaults.
 */
export function getCorsOrigins(): string[] {
  const raw = process.env['CORS_ORIGINS']?.trim();
  if (raw === undefined || raw === '') {
    return [...DEFAULT_CORS_ORIGINS];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Whether a browser Origin may call the API.
 * Allows configured list plus savemytokens `*.vercel.app` hosts (web/api previews).
 */
export function isAllowedCorsOrigin(origin: string): boolean {
  if (getCorsOrigins().includes(origin)) {
    return true;
  }
  // Current Vercel hosts still use the old project prefix until renamed;
  // also allow savemytokens*.vercel.app after project rename.
  return /^https:\/\/(savemytokens|prunr)[\w-]*\.vercel\.app$/i.test(origin);
}

/** True when Upstash Redis REST credentials are present. */
export function hasUpstashConfig(): boolean {
  return Boolean(
    process.env['UPSTASH_REDIS_REST_URL']?.trim() &&
      process.env['UPSTASH_REDIS_REST_TOKEN']?.trim(),
  );
}
