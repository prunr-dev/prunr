import { Hono } from 'hono';
import { probeUrl } from '@prunr-dev/core';
import {
  PROBLEM_JSON_MEDIA_TYPE,
  Problems,
  type ProblemDetails,
  type TriageResult,
} from '@prunr-dev/types';

/**
 * Hono application exposing Prunr triage over HTTP.
 *
 * Routes:
 * - `GET /health` — liveness
 * - `GET /v1/triage?url=` — runs {@link probeUrl} and returns {@link TriageResult}
 */
export function createApp(): Hono {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true as const, service: 'prunr-api' }));

  app.get('/v1/triage', async (c) => {
    const url = c.req.query('url');

    if (url === undefined || url.trim() === '') {
      return problemResponse(
        Problems.badRequest('Query parameter "url" is required.'),
      );
    }

    let result: TriageResult;
    try {
      result = await probeUrl(url.trim());
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : 'Unexpected probe failure.';
      return problemResponse(Problems.unreachable(detail));
    }

    // Map clear SSRF / parse failures to RFC 7807 for HTTP clients.
    if (
      result.action === 'ERROR_UNREACHABLE' &&
      /disallowed|Only http|could not be parsed/i.test(result.reason)
    ) {
      const problem = /could not be parsed/i.test(result.reason)
        ? Problems.invalidUrl(result.reason)
        : Problems.ssrfBlocked(result.reason);
      return problemResponse(problem);
    }

    return c.json(result);
  });

  return app;
}

function problemResponse(problem: ProblemDetails): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      'Content-Type': PROBLEM_JSON_MEDIA_TYPE,
    },
  });
}
