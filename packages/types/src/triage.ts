/**
 * Recommended fetch strategy after pre-flight triage.
 *
 * Priority when synthesizing (highest wins):
 * ERROR_UNREACHABLE → WAF_BLOCKED → USE_LLMS_TXT → HEADLESS_REQUIRED → FETCH_RAW
 */
export type TriageAction =
  | 'USE_LLMS_TXT'
  | 'FETCH_RAW'
  | 'HEADLESS_REQUIRED'
  | 'WAF_BLOCKED'
  | 'ERROR_UNREACHABLE';

/** Well-known paths where author-curated Markdown may be published. */
export type LlmsTxtPath = '/llms.txt' | '/.well-known/llms.txt';

/** Bot-shield / WAF vendors detectable via passive header, cookie, or body signals. */
export type ShieldVendor =
  'cloudflare' | 'cloudflare_turnstile' | 'datadome' | 'unknown';

/**
 * Machine-readable probe failure codes used internally and optionally on Problem Details.
 */
export type ProbeErrorCode =
  'SSRF_BLOCKED' | 'TIMEOUT' | 'DNS_FAILURE' | 'NETWORK' | 'INVALID_URL';

/**
 * Signals collected during passive header/cookie/body inspection.
 */
export interface ShieldTelemetry {
  /** True when at least one shield indicator was observed. */
  detected: boolean;
  /** Most specific vendor inferred from evidence, or null if none. */
  vendor: ShieldVendor | null;
  /**
   * Concrete observations supporting detection
   * (e.g. `cf-ray`, `cf-mitigated`, `x-datadome`, cookie names).
   */
  evidence: string[];
  /** HTTP status from the origin probe, if any. */
  httpStatus: number | null;
}

/**
 * Result of probing for author-curated Markdown (`llms.txt`).
 */
export interface LlmsTxtDiscovery {
  found: boolean;
  /** Absolute URL of the discovered document, if found. */
  url: string | null;
  path: LlmsTxtPath | null;
  contentType: string | null;
  /** Bytes observed from a capped read; null if not fetched. */
  byteLength: number | null;
}

/**
 * Canonical triage response shared by REST, MCP, and the web visualizer.
 */
export interface TriageResult {
  /** Normalized absolute URL that was probed. */
  url: string;
  action: TriageAction;
  /**
   * Heuristic percent of tokens avoided vs a naive HTML crawl + LLM extract.
   * Range 0–100; 0 when unreachable or already minimal.
   */
  estimatedTokenSavingsPercent: number;
  llmsTxt: LlmsTxtDiscovery;
  shields: ShieldTelemetry;
  /** Wall-clock probe duration in milliseconds. */
  latencyMs: number;
  /** Human-readable reason for the chosen action. */
  reason: string;
  /** ISO-8601 timestamp when the probe completed. */
  probedAt: string;
}

/**
 * Internal probe signals before synthesis.
 * Not always exposed on the public wire; useful for diagnostics and tests.
 */
export interface ProbeSignals {
  finalUrl: string;
  status: number | null;
  headers: Record<string, string>;
  /**
   * First ~4KB of body for SPA / challenge sniffing.
   * Must not be logged wholesale in production.
   */
  bodySnippet: string | null;
  llmsTxt: LlmsTxtDiscovery;
  shields: ShieldTelemetry;
  errorCode: ProbeErrorCode | null;
}
