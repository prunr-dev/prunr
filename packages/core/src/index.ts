/**
 * @savemytokens/core — pure pre-flight triage probe engine.
 *
 * Apps (REST / MCP) should import {@link probeUrl} and map `TriageResult`
 * to their transport. Do not add framework adapters in this package.
 */

export {
  probeUrl,
  synthesizeAction,
  PROBE_TIMEOUT_MS,
  type ProbeUrlOptions,
} from './probe.js';

export {
  estimateTokens,
  bytesToTokens,
  resolveHtmlBytes,
  parseContentLength,
  CHARS_PER_TOKEN,
  DEFAULT_HTML_BASELINE_BYTES,
  RAW_VS_HEADLESS_OVERHEAD,
  MAX_SAVINGS_PERCENT,
  type EstimateTokenInput,
} from './token-estimate.js';

export {
  validateProbeTarget,
  isDisallowedIp,
  type SsrfValidationResult,
  type DnsLookupFn,
  type ValidateProbeTargetOptions,
} from './ssrf.js';

export {
  discoverLlmsTxt,
  emptyLlmsTxtDiscovery,
  isTextishContentType,
  LLMS_TXT_PATHS,
} from './llms-txt.js';

export {
  inspectShields,
  emptyShieldTelemetry,
  type ShieldInspectionInput,
} from './shields.js';

export { looksLikeSpaShell } from './spa.js';
