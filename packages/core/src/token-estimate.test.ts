import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { emptyLlmsTxtDiscovery } from './llms-txt.js';
import {
  bytesToTokens,
  CHARS_PER_TOKEN,
  DEFAULT_HTML_BASELINE_BYTES,
  estimateTokens,
  MAX_SAVINGS_PERCENT,
  parseContentLength,
  RAW_VS_HEADLESS_OVERHEAD,
  resolveHtmlBytes,
} from './token-estimate.js';

describe('bytesToTokens', () => {
  it('returns 0 for non-positive input', () => {
    assert.equal(bytesToTokens(0), 0);
    assert.equal(bytesToTokens(-10), 0);
  });

  it('rounds via CHARS_PER_TOKEN', () => {
    assert.equal(bytesToTokens(CHARS_PER_TOKEN), 1);
    assert.equal(bytesToTokens(CHARS_PER_TOKEN * 10), 10);
  });
});

describe('resolveHtmlBytes', () => {
  it('prefers the largest of content-length, origin bytes, and default floor', () => {
    assert.equal(resolveHtmlBytes(null, null), DEFAULT_HTML_BASELINE_BYTES);
    assert.equal(resolveHtmlBytes(100, null), DEFAULT_HTML_BASELINE_BYTES);
    assert.equal(resolveHtmlBytes(100, 50_000), 50_000);
    assert.equal(resolveHtmlBytes(4096, 2000), DEFAULT_HTML_BASELINE_BYTES);
  });
});

describe('parseContentLength', () => {
  it('parses a valid header', () => {
    assert.equal(parseContentLength({ 'content-length': '12345' }), 12345);
  });

  it('returns null for missing or invalid values', () => {
    assert.equal(parseContentLength(undefined), null);
    assert.equal(parseContentLength({}), null);
    assert.equal(parseContentLength({ 'content-length': '' }), null);
    assert.equal(parseContentLength({ 'content-length': 'nope' }), null);
  });
});

describe('estimateTokens', () => {
  it('returns zeros for WAF_BLOCKED and ERROR_UNREACHABLE', () => {
    for (const action of ['WAF_BLOCKED', 'ERROR_UNREACHABLE'] as const) {
      const est = estimateTokens({
        action,
        llmsTxt: emptyLlmsTxtDiscovery(),
        originByteLength: 4000,
        originContentLength: 40_000,
      });
      assert.deepEqual(est, {
        baselineTokens: 0,
        actionTokens: 0,
        savingsPercent: 0,
        method: 'byte_heuristic',
      });
    }
  });

  it('estimates USE_LLMS_TXT from llms bytes vs HTML baseline', () => {
    const llmsBytes = 800;
    const htmlBytes = 40_000;
    const est = estimateTokens({
      action: 'USE_LLMS_TXT',
      llmsTxt: {
        found: true,
        url: 'https://example.com/llms.txt',
        path: '/llms.txt',
        contentType: 'text/plain',
        byteLength: llmsBytes,
      },
      originByteLength: 4096,
      originContentLength: htmlBytes,
    });

    assert.equal(est.method, 'byte_heuristic');
    assert.equal(est.actionTokens, bytesToTokens(llmsBytes));
    assert.equal(est.baselineTokens, bytesToTokens(htmlBytes));
    assert.equal(
      est.savingsPercent,
      Math.min(
        MAX_SAVINGS_PERCENT,
        Math.round((1 - est.actionTokens / est.baselineTokens) * 100),
      ),
    );
    assert.ok(est.savingsPercent > 0);
  });

  it('estimates FETCH_RAW with headless overhead on baseline', () => {
    const htmlBytes = 50_000;
    const est = estimateTokens({
      action: 'FETCH_RAW',
      llmsTxt: emptyLlmsTxtDiscovery(),
      originByteLength: 4096,
      originContentLength: htmlBytes,
    });

    const actionTokens = bytesToTokens(htmlBytes);
    const baselineTokens = Math.round(actionTokens * RAW_VS_HEADLESS_OVERHEAD);
    assert.equal(est.actionTokens, actionTokens);
    assert.equal(est.baselineTokens, baselineTokens);
    assert.equal(
      est.savingsPercent,
      Math.round((1 - actionTokens / baselineTokens) * 100),
    );
  });

  it('returns 0% savings for HEADLESS_REQUIRED with equal paths', () => {
    const est = estimateTokens({
      action: 'HEADLESS_REQUIRED',
      llmsTxt: emptyLlmsTxtDiscovery(),
      originByteLength: 500,
      originContentLength: null,
    });

    const tokens = bytesToTokens(DEFAULT_HTML_BASELINE_BYTES);
    assert.equal(est.baselineTokens, tokens);
    assert.equal(est.actionTokens, tokens);
    assert.equal(est.savingsPercent, 0);
  });

  it('caps savingsPercent at MAX_SAVINGS_PERCENT', () => {
    const est = estimateTokens({
      action: 'USE_LLMS_TXT',
      llmsTxt: {
        found: true,
        url: 'https://example.com/llms.txt',
        path: '/llms.txt',
        contentType: 'text/plain',
        byteLength: 4,
      },
      originByteLength: null,
      originContentLength: 1_000_000,
    });
    assert.equal(est.savingsPercent, MAX_SAVINGS_PERCENT);
  });
});
