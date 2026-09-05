/**
 * @prunr-dev/core — pure pre-flight triage probe engine.
 *
 * Apps (REST / MCP) should import {@link probeUrl} and map `TriageResult`
 * to their transport. Do not add framework adapters in this package.
 */

export { probeUrl, PROBE_TIMEOUT_MS, TOKEN_SAVINGS_BY_ACTION } from './probe.js';

export {
  validateProbeTarget,
  type SsrfValidationResult,
} from './ssrf.js';

export {
  discoverLlmsTxt,
  emptyLlmsTxtDiscovery,
  LLMS_TXT_PATHS,
} from './llms-txt.js';

export {
  inspectShields,
  emptyShieldTelemetry,
  type ShieldInspectionInput,
} from './shields.js';
