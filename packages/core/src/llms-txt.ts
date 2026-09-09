import type { LlmsTxtDiscovery, LlmsTxtPath } from '@savemytokens/types';

import {
  fetchOrigin,
  type FetchOriginOptions,
  type OriginFetchSuccess,
} from './fetch-origin.js';

/** Candidate paths probed for author-curated Markdown. */
export const LLMS_TXT_PATHS: readonly LlmsTxtPath[] = [
  '/llms.txt',
  '/.well-known/llms.txt',
] as const;

/**
 * Empty discovery result used when no document was found (or not yet probed).
 */
export function emptyLlmsTxtDiscovery(): LlmsTxtDiscovery {
  return {
    found: false,
    url: null,
    path: null,
    contentType: null,
    byteLength: null,
  };
}

export interface DiscoverLlmsTxtOptions extends FetchOriginOptions {}

/**
 * Discovers an `llms.txt` (or well-known equivalent) for the given origin.
 *
 * - GET each path under a shared {@link AbortSignal} budget.
 * - Accept the first `200` with a text-ish `Content-Type`.
 * - Prefer `/llms.txt` over `/.well-known/llms.txt` when both succeed.
 * - Cap the body read; record `byteLength` without storing full content here.
 *
 * @param origin - Sanitized absolute origin URL (from SSRF validation)
 * @param signal - Abort signal shared with sibling probes
 * @param options - Optional fetch override for tests
 */
export async function discoverLlmsTxt(
  origin: URL,
  signal?: AbortSignal,
  options?: DiscoverLlmsTxtOptions,
): Promise<LlmsTxtDiscovery> {
  const sharedSignal = signal ?? AbortSignal.timeout(2000);

  const settled = await Promise.all(
    LLMS_TXT_PATHS.map(async (path) => {
      const target = new URL(path, origin);
      const result = await fetchOrigin(target, sharedSignal, options);
      return { path, result };
    }),
  );

  // Prefer path order in LLMS_TXT_PATHS (root before well-known).
  for (const path of LLMS_TXT_PATHS) {
    const entry = settled.find((s) => s.path === path);
    if (entry === undefined || !entry.result.ok) {
      continue;
    }
    if (isAcceptableLlmsTxt(entry.result)) {
      return {
        found: true,
        url: entry.result.finalUrl,
        path,
        contentType: entry.result.contentType,
        byteLength: entry.result.byteLength,
      };
    }
  }

  return emptyLlmsTxtDiscovery();
}

function isAcceptableLlmsTxt(result: OriginFetchSuccess): boolean {
  if (result.status !== 200) {
    return false;
  }
  return isTextishContentType(result.contentType);
}

/**
 * Accepts text/plain, text/markdown, and other text/* types.
 * Rejects missing or non-text content types.
 */
export function isTextishContentType(contentType: string | null): boolean {
  if (contentType === null || contentType.trim() === '') {
    return false;
  }
  const media = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return media.startsWith('text/');
}
