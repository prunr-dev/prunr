import type { TriageAction } from '@prunr-dev/types';

/**
 * Curated demo targets for the visualizer.
 * WAF / SPA examples may drift as sites change; labels stay educational.
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
    url: 'https://docs.anthropic.com',
    hint: 'USE_LLMS_TXT',
  },
  {
    id: 'waf',
    label: 'WAF / challenge',
    url: 'https://www.cloudflare.com',
    hint: 'WAF_BLOCKED',
  },
  {
    id: 'spa',
    label: 'SPA shell',
    url: 'https://react.dev',
    hint: 'HEADLESS_REQUIRED',
  },
] as const;
