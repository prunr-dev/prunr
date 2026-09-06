import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inspectShields } from './shields.js';

describe('inspectShields', () => {
  it('detects Cloudflare from headers and cookies', () => {
    const result = inspectShields({
      headers: {
        'cf-ray': 'abc123',
        server: 'cloudflare',
      },
      setCookie: ['__cf_bm=xyz; Path=/; HttpOnly'],
      httpStatus: 200,
    });

    assert.equal(result.detected, true);
    assert.equal(result.vendor, 'cloudflare');
    assert.ok(result.evidence.includes('cf-ray'));
    assert.ok(result.evidence.includes('cookie:__cf_bm'));
  });

  it('prefers Turnstile when challenge markers are present', () => {
    const result = inspectShields({
      headers: {
        'cf-ray': 'abc',
        'cf-mitigated': 'challenge',
      },
      bodySnippet: '<html>Just a moment... turnstile</html>',
      httpStatus: 403,
    });

    assert.equal(result.detected, true);
    assert.equal(result.vendor, 'cloudflare_turnstile');
    assert.ok(result.evidence.includes('body:just-a-moment'));
  });

  it('detects DataDome from headers and cookies', () => {
    const result = inspectShields({
      headers: { 'x-datadome': 'protected' },
      setCookie: ['datadome=abc; Path=/'],
      bodySnippet: 'c.datadome.co interstitial',
      httpStatus: 403,
    });

    assert.equal(result.detected, true);
    assert.equal(result.vendor, 'datadome');
    assert.ok(result.evidence.includes('x-datadome'));
  });

  it('falls back to unknown on challenge-like 403 without vendor', () => {
    const result = inspectShields({
      headers: {},
      bodySnippet: '<html>Access denied — verify you are human</html>',
      httpStatus: 403,
    });

    assert.equal(result.detected, true);
    assert.equal(result.vendor, 'unknown');
  });

  it('returns undetected for clean responses', () => {
    const result = inspectShields({
      headers: { 'content-type': 'text/html' },
      bodySnippet: '<html><body><article>Hello</article></body></html>',
      httpStatus: 200,
    });

    assert.equal(result.detected, false);
    assert.equal(result.vendor, null);
    assert.deepEqual(result.evidence, []);
  });
});
