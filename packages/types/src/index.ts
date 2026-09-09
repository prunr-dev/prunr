/**
 * @savemytokens/types — shared contracts for triage results and API errors.
 */

export type {
  TriageAction,
  LlmsTxtPath,
  ShieldVendor,
  ProbeErrorCode,
  ShieldTelemetry,
  LlmsTxtDiscovery,
  TriageResult,
  ProbeSignals,
} from './triage.js';

export type { ProblemDetails, CreateProblemDetailsInput } from './errors.js';

export {
  PROBLEM_JSON_MEDIA_TYPE,
  createProblemDetails,
  Problems,
} from './errors.js';
