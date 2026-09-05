import { serve } from '@hono/node-server';

import { createApp } from './app.js';

const port = Number.parseInt(process.env['PORT'] ?? '8787', 10);

const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@prunr-dev/api listening on http://localhost:${info.port}`);
});
