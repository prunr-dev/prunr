import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { probeUrl } from '@savemytokens/core';
import {
  PROBLEM_JSON_MEDIA_TYPE,
  Problems,
  type ProblemDetails,
  type TriageResult,
} from '@savemytokens/types';

import { getCachedTriage, setCachedTriage } from './cache.js';
import { API_VERSION, isAllowedCorsOrigin } from './env.js';
import { checkTriageRateLimit, clientIpFromHeaders } from './rate-limit.js';

/**
 * Hono application exposing savemytokens triage over HTTP.
 *
 * Routes:
 * - `GET /health` — liveness + version
 * - `GET /v1/triage?url=` — runs {@link probeUrl} and returns {@link TriageResult}
 */
export function createApp(): Hono {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: (origin) => (isAllowedCorsOrigin(origin) ? origin : null),
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  app.get('/health', (c) =>
    c.json({
      ok: true as const,
      service: 'savemytokens-api',
      version: API_VERSION,
    }),
  );

  app.get('/', (c) =>
    c.json({
      ok: true as const,
      service: 'savemytokens-api',
      version: API_VERSION,
      endpoints: ['/health', '/v1/triage?url='],
    }),
  );

  app.get('/v1/triage', async (c) => {
    const url = c.req.query('url');

    if (url === undefined || url.trim() === '') {
      return problemResponse(
        Problems.badRequest('Query parameter "url" is required.'),
      );
    }

    const target = url.trim();
    const ip = clientIpFromHeaders((name) => c.req.header(name));
    const rate = await checkTriageRateLimit(ip);
    if (!rate.ok) {
      return problemResponse(
        Problems.tooManyRequests(
          'Rate limit exceeded (30 requests per minute). Try again shortly.',
        ),
      );
    }

    const cached = await getCachedTriage(target);
    if (cached) {
      return c.json(cached, 200, {
        'X-Savemytokens-Cache': 'HIT',
      });
    }

    let result: TriageResult;
    try {
      result = await probeUrl(target);
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

    await setCachedTriage(target, result);

    return c.json(result, 200, {
      'X-Savemytokens-Cache': 'MISS',
    });
  });

  return app;
}

/** Default export for Vercel’s native Hono backend (`export default app`). */
const app = createApp();
export default app;

function problemResponse(problem: ProblemDetails): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      'Content-Type': PROBLEM_JSON_MEDIA_TYPE,
    },
  });
}
