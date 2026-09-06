import type { ProbeErrorCode } from './triage.js';

/**
 * RFC 7807 Problem Details for HTTP APIs.
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /**
   * URI reference that identifies the problem type.
   * When dereferenced, should provide human-readable documentation.
   * Defaults to `"about:blank"` when no finer type applies.
   */
  type: string;
  /** Short, human-readable summary of the problem type. */
  title: string;
  /** HTTP status code for this occurrence. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail?: string;
  /** URI reference that identifies this specific occurrence. */
  instance?: string;
  /** Prunr-specific machine-readable code (extension member). */
  code?: ProbeErrorCode | string;
}

/** MIME type for RFC 7807 JSON problem responses. */
export const PROBLEM_JSON_MEDIA_TYPE = 'application/problem+json' as const;

export interface CreateProblemDetailsInput {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: ProbeErrorCode | string;
}

/**
 * Builds a RFC 7807 Problem Details object with sensible defaults.
 */
export function createProblemDetails(
  input: CreateProblemDetailsInput,
): ProblemDetails {
  const problem: ProblemDetails = {
    type: input.type ?? 'about:blank',
    title: input.title,
    status: input.status,
  };

  if (input.detail !== undefined) {
    problem.detail = input.detail;
  }
  if (input.instance !== undefined) {
    problem.instance = input.instance;
  }
  if (input.code !== undefined) {
    problem.code = input.code;
  }

  return problem;
}

/** Common Prunr API problem factories. */
export const Problems = {
  badRequest(detail: string, code?: ProbeErrorCode | string): ProblemDetails {
    return createProblemDetails({
      type: 'https://prunr.dev/problems/bad-request',
      title: 'Bad Request',
      status: 400,
      detail,
      code,
    });
  },

  invalidUrl(
    detail = 'The provided URL is invalid or unsupported.',
  ): ProblemDetails {
    return createProblemDetails({
      type: 'https://prunr.dev/problems/invalid-url',
      title: 'Invalid URL',
      status: 400,
      detail,
      code: 'INVALID_URL',
    });
  },

  ssrfBlocked(
    detail = 'The target URL resolves to a private or disallowed address.',
  ): ProblemDetails {
    return createProblemDetails({
      type: 'https://prunr.dev/problems/ssrf-blocked',
      title: 'SSRF Blocked',
      status: 400,
      detail,
      code: 'SSRF_BLOCKED',
    });
  },

  unreachable(detail = 'The target URL could not be reached.'): ProblemDetails {
    return createProblemDetails({
      type: 'https://prunr.dev/problems/unreachable',
      title: 'Unreachable',
      status: 502,
      detail,
      code: 'NETWORK',
    });
  },

  timeout(detail = 'The probe timed out.'): ProblemDetails {
    return createProblemDetails({
      type: 'https://prunr.dev/problems/timeout',
      title: 'Probe Timeout',
      status: 504,
      detail,
      code: 'TIMEOUT',
    });
  },

  tooManyRequests(
    detail = 'Rate limit exceeded. Try again shortly.',
  ): ProblemDetails {
    return createProblemDetails({
      type: 'https://prunr.dev/problems/rate-limit',
      title: 'Too Many Requests',
      status: 429,
      detail,
      code: 'RATE_LIMITED',
    });
  },
} as const;
