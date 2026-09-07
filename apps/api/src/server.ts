/**
 * Local Node entry for `@prunr-dev/api`.
 * Vercel uses the default export from `src/app.ts` instead — do not call
 * `serve()` from a module Vercel imports as the Hono application entry.
 */
import { serve } from '@hono/node-server';

import app from './app.js';

const port = Number.parseInt(process.env['PORT'] ?? '8787', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@prunr-dev/api listening on http://localhost:${info.port}`);
});
