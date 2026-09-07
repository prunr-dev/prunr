/** API package version surfaced on `/health`. */
export const API_VERSION = '0.0.0' as const;

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://prunr.dev',
  'https://www.prunr.dev',
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
 * Allows configured list plus Prunr `*.vercel.app` hosts (web/api previews).
 */
export function isAllowedCorsOrigin(origin: string): boolean {
  if (getCorsOrigins().includes(origin)) {
    return true;
  }
  // e.g. https://prunr-web-three.vercel.app, https://prunr-api.vercel.app
  return /^https:\/\/prunr[\w-]*\.vercel\.app$/i.test(origin);
}

/** True when Upstash Redis REST credentials are present. */
export function hasUpstashConfig(): boolean {
  return Boolean(
    process.env['UPSTASH_REDIS_REST_URL']?.trim() &&
      process.env['UPSTASH_REDIS_REST_TOKEN']?.trim(),
  );
}
