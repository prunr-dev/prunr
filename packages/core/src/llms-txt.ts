import type { LlmsTxtDiscovery, LlmsTxtPath } from '@prunr-dev/types';

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

/**
 * Discovers an `llms.txt` (or well-known equivalent) for the given origin.
 *
 * Intended behavior (Phase 2):
 * - GET each path under a shared {@link AbortSignal} budget (2s).
 * - Accept the first `200` response with a text-ish `Content-Type`.
 * - Cap the body read; record `byteLength` without storing full content here.
 *
 * @param origin - Sanitized absolute origin URL (from SSRF validation)
 * @param signal - Optional abort signal shared with sibling probes
 *
 * @remarks Phase 1 stub always returns {@link emptyLlmsTxtDiscovery}.
 */
export async function discoverLlmsTxt(
  _origin: URL,
  _signal?: AbortSignal,
): Promise<LlmsTxtDiscovery> {
  // TODO(phase-2): parallel GETs to LLMS_TXT_PATHS with AbortSignal.timeout(2000).
  return emptyLlmsTxtDiscovery();
}
