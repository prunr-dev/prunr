import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { hasUpstashConfig } from './env.js';

/** Public demo budget: 30 requests per IP per minute. */
const WINDOW = '1 m' as const;
const LIMIT = 30 as const;

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) {
    return ratelimit;
  }
  if (!hasUpstashConfig()) {
    ratelimit = null;
    return ratelimit;
  }
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    prefix: 'prunr:ratelimit',
    analytics: false,
  });
  return ratelimit;
}

export type RateLimitDecision =
  { ok: true; remaining: number | null } | { ok: false; remaining: number };

/**
 * Per-IP rate limit for `/v1/triage`. Fail-open when Redis is unset or errors.
 */
export async function checkTriageRateLimit(
  ip: string,
): Promise<RateLimitDecision> {
  const limiter = getRatelimit();
  if (!limiter) {
    return { ok: true, remaining: null };
  }
  try {
    const result = await limiter.limit(ip || 'anonymous');
    if (!result.success) {
      return { ok: false, remaining: result.remaining };
    }
    return { ok: true, remaining: result.remaining };
  } catch (err) {
    console.warn('[prunr-api] rate limit check failed (fail open)', err);
    return { ok: true, remaining: null };
  }
}

/**
 * Best-effort client IP from proxy headers (Vercel / reverse proxies).
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }
  return 'anonymous';
}
