import type {
  LlmsTxtDiscovery,
  TokenEstimate,
  TriageAction,
} from '@savemytokens/types';

/** Proxy tokenizer: approximate tokens from UTF-8 byte/char length. */
export const CHARS_PER_TOKEN = 4 as const;

/**
 * Floor for HTML baseline when Content-Length / observed bytes are missing or tiny.
 * ~32KB ≈ a typical docs page.
 */
export const DEFAULT_HTML_BASELINE_BYTES = 32_768 as const;

/**
 * FETCH_RAW baseline multiplier vs raw HTML tokens
 * (avoided headless/DOM-dump / heavier extract path).
 */
export const RAW_VS_HEADLESS_OVERHEAD = 1.6 as const;

/** Never claim near-100% from a partial probe read. */
export const MAX_SAVINGS_PERCENT = 95 as const;

export interface EstimateTokenInput {
  action: TriageAction;
  llmsTxt: LlmsTxtDiscovery;
  /** Bytes observed from the capped origin body read; null if origin failed. */
  originByteLength: number | null;
  /**
   * Parsed `Content-Length` from the origin response when available.
   * Prefer this over the capped snippet when estimating full-page size.
   */
  originContentLength: number | null;
}

/**
 * Convert a byte/char length to an integer token count via {@link CHARS_PER_TOKEN}.
 */
export function bytesToTokens(bytes: number): number {
  if (bytes <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(bytes / CHARS_PER_TOKEN));
}

/**
 * Best-effort HTML size in bytes for baseline/action estimates.
 */
export function resolveHtmlBytes(
  originByteLength: number | null,
  originContentLength: number | null,
): number {
  const candidates = [
    originContentLength ?? 0,
    originByteLength ?? 0,
    DEFAULT_HTML_BASELINE_BYTES,
  ];
  return Math.max(...candidates);
}

function deriveSavingsPercent(
  baselineTokens: number,
  actionTokens: number,
): number {
  if (baselineTokens <= 0) {
    return 0;
  }
  const raw = Math.round((1 - actionTokens / baselineTokens) * 100);
  return Math.min(MAX_SAVINGS_PERCENT, Math.max(0, raw));
}

function estimate(
  baselineTokens: number,
  actionTokens: number,
): TokenEstimate {
  return {
    baselineTokens,
    actionTokens,
    savingsPercent: deriveSavingsPercent(baselineTokens, actionTokens),
    method: 'byte_heuristic',
  };
}

/**
 * Byte-heuristic token estimate for a synthesized triage action.
 *
 * Uses observed llms.txt / origin sizes (plus Content-Length when present).
 * Not measured agent usage — provisional until an MCP on/off harness exists.
 */
export function estimateTokens(input: EstimateTokenInput): TokenEstimate {
  const { action, llmsTxt, originByteLength, originContentLength } = input;

  switch (action) {
    case 'WAF_BLOCKED':
    case 'ERROR_UNREACHABLE':
      return estimate(0, 0);

    case 'USE_LLMS_TXT': {
      const actionBytes = llmsTxt.byteLength ?? 0;
      const actionTokens = bytesToTokens(actionBytes);
      const baselineTokens = bytesToTokens(
        resolveHtmlBytes(originByteLength, originContentLength),
      );
      return estimate(baselineTokens, actionTokens);
    }

    case 'FETCH_RAW': {
      const actionTokens = bytesToTokens(
        resolveHtmlBytes(originByteLength, originContentLength),
      );
      const baselineTokens = Math.max(
        actionTokens,
        Math.round(actionTokens * RAW_VS_HEADLESS_OVERHEAD),
      );
      return estimate(baselineTokens, actionTokens);
    }

    case 'HEADLESS_REQUIRED': {
      const tokens = bytesToTokens(
        resolveHtmlBytes(originByteLength, originContentLength),
      );
      // Same absolute path either way — token % is 0; cost is compute/latency.
      return estimate(tokens, tokens);
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Parse a Content-Length header value into a non-negative integer, or null.
 */
export function parseContentLength(
  headers: Record<string, string> | undefined,
): number | null {
  if (!headers) {
    return null;
  }
  const raw = headers['content-length'];
  if (raw === undefined || raw === '') {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}
