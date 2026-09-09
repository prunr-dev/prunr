import type { TriageResult } from '@savemytokens/types';
import { Redis } from '@upstash/redis';

import { hasUpstashConfig } from './env.js';

/** Short TTL for public-demo triage responses (seconds). */
export const TRIAGE_CACHE_TTL_SECONDS = 60 as const;

const CACHE_PREFIX = 'savemytokens:triage:v1:' as const;

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) {
    return redis;
  }
  if (!hasUpstashConfig()) {
    redis = null;
    return redis;
  }
  redis = Redis.fromEnv();
  return redis;
}

/**
 * Normalized cache key for a probe target URL (hash stripped).
 */
export function triageCacheKey(url: string): string {
  let normalized = url.trim();
  try {
    const parsed = new URL(normalized);
    parsed.hash = '';
    normalized = parsed.toString();
  } catch {
    // Keep trimmed input when not a valid absolute URL.
  }
  return `${CACHE_PREFIX}${normalized}`;
}

/**
 * Returns a cached {@link TriageResult}, or `null` on miss / Redis unavailable.
 * Fail-open: never throws to the caller.
 */
export async function getCachedTriage(
  url: string,
): Promise<TriageResult | null> {
  const client = getRedis();
  if (!client) {
    return null;
  }
  try {
    const value = await client.get<TriageResult>(triageCacheKey(url));
    return value ?? null;
  } catch (err) {
    console.warn('[savemytokens-api] triage cache get failed (fail open)', err);
    return null;
  }
}

/**
 * Stores a {@link TriageResult} with a short TTL. Fail-open on errors.
 */
export async function setCachedTriage(
  url: string,
  result: TriageResult,
): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }
  try {
    await client.set(triageCacheKey(url), result, {
      ex: TRIAGE_CACHE_TTL_SECONDS,
    });
  } catch (err) {
    console.warn('[savemytokens-api] triage cache set failed (fail open)', err);
  }
}
