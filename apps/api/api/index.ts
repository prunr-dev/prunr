/**
 * Vercel serverless entry for `@prunr-dev/api`.
 * Local development continues to use `src/index.ts` + `@hono/node-server`.
 */
import { handle } from 'hono/vercel';

import { createApp } from '../src/app.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const app = createApp();

export default handle(app);
