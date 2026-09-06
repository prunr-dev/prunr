/**
 * Client-side helpers for calling @prunr-dev/api.
 * The web app never imports @prunr-dev/core — probes run on the API.
 */

import type { ProblemDetails, TriageResult } from '@prunr-dev/types';

/** Base URL for the REST microservice (no trailing slash). */
export function getApiBaseUrl(): string {
  const raw =
    process.env['NEXT_PUBLIC_PRUNR_API_URL'] ?? 'http://localhost:8787';
  return raw.replace(/\/$/, '');
}

export type TriageFetchResult =
  | { ok: true; data: TriageResult }
  | { ok: false; problem: ProblemDetails; status: number };

/**
 * Calls `GET /v1/triage?url=` and returns either a TriageResult or Problem Details.
 */
export async function fetchTriage(url: string): Promise<TriageFetchResult> {
  const endpoint = `${getApiBaseUrl()}/v1/triage?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint);

  const body: unknown = await response.json();

  if (!response.ok) {
    const problem = body as ProblemDetails;
    return {
      ok: false,
      status: response.status,
      problem: {
        type: problem.type ?? 'about:blank',
        title: problem.title ?? 'Request failed',
        status: problem.status ?? response.status,
        detail: problem.detail,
        code: problem.code,
      },
    };
  }

  return { ok: true, data: body as TriageResult };
}
