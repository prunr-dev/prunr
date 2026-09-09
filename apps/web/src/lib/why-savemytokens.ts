import type { TriageAction } from '@savemytokens/types';

/**
 * Honest “why try savemytokens” cases from live validation (see docs/validation-findings.md).
 * Linked into the homepage below the fold with `?url=` deep links.
 */
export interface WhySavemytokensCase {
  id: string;
  url: string;
  action: TriageAction;
  /** One short line: what triage saves vs a naive crawl. */
  summary: string;
}

export const WHY_SAVEMYTOKENS_CASES: readonly WhySavemytokensCase[] = [
  {
    id: 'llms',
    url: 'https://react.dev',
    action: 'USE_LLMS_TXT',
    summary: 'Author-curated Markdown at /llms.txt — skip crawling SPA HTML.',
  },
  {
    id: 'raw',
    url: 'https://en.wikipedia.org/wiki/HTTP',
    action: 'FETCH_RAW',
    summary: 'Static-looking HTML — a cheap GET beats opening a headless browser.',
  },
  {
    id: 'waf',
    url: 'https://www.npmjs.com/package/hono',
    action: 'WAF_BLOCKED',
    summary: 'Active Turnstile challenge — abort before burning proxy reputation.',
  },
] as const;
