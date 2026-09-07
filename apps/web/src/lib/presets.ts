import type { TriageAction } from '@prunr-dev/types';

/**
 * Curated demo targets for the visualizer.
 * Live sites may drift; labels stay educational.
 */
export interface DemoPreset {
  id: string;
  label: string;
  url: string;
  /** Expected-ish action for UI hinting (not guaranteed). */
  hint: TriageAction;
}

export const DEMO_PRESETS: readonly DemoPreset[] = [
  {
    id: 'fetch-raw',
    label: 'Static HTML',
    url: 'https://example.com',
    hint: 'FETCH_RAW',
  },
  {
    id: 'llms-txt',
    label: 'llms.txt',
    url: 'https://react.dev',
    hint: 'USE_LLMS_TXT',
  },
  {
    id: 'waf',
    label: 'WAF / challenge',
    url: 'https://www.npmjs.com/package/hono',
    hint: 'WAF_BLOCKED',
  },
  {
    id: 'docs-html',
    label: 'Docs HTML',
    url: 'https://en.wikipedia.org/wiki/HTTP',
    hint: 'FETCH_RAW',
  },
] as const;
