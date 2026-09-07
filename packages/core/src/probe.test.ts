import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { emptyLlmsTxtDiscovery } from './llms-txt.js';
import { probeUrl, synthesizeAction } from './probe.js';
import { emptyShieldTelemetry } from './shields.js';
import type { DnsLookupFn } from './ssrf.js';

const publicLookup: DnsLookupFn = async () => [
  { address: '93.184.216.34', family: 4 },
];

function jsonHeaders(init?: Record<string, string>): Headers {
  return new Headers(init);
}

function textResponse(
  body: string,
  init: {
    status?: number;
    headers?: Record<string, string>;
    url?: string;
  } = {},
): Response {
  const headers = jsonHeaders({
    'content-type': 'text/html; charset=utf-8',
    ...init.headers,
  });
  const response = new Response(body, {
    status: init.status ?? 200,
    headers,
  });
  Object.defineProperty(response, 'url', {
    value: init.url ?? 'https://example.com/',
  });
  return response;
}

describe('synthesizeAction', () => {
  it('returns ERROR_UNREACHABLE when origin fails and no llms.txt', () => {
    const result = synthesizeAction({
      originResult: {
        ok: false,
        error: 'timeout',
        reason: 'Probe timed out waiting for the origin response.',
      },
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: emptyShieldTelemetry(),
    });
    assert.equal(result.action, 'ERROR_UNREACHABLE');
    assert.match(result.reason, /timed out/i);
  });

  it('returns WAF_BLOCKED when challenge shields are detected', () => {
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 403,
        headers: { 'cf-ray': '1' },
        setCookie: [],
        bodySnippet: 'Just a moment',
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: 13,
      },
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: {
        detected: true,
        vendor: 'cloudflare_turnstile',
        evidence: ['body:just-a-moment', 'cdn:cf-ray'],
        httpStatus: 403,
      },
    });
    assert.equal(result.action, 'WAF_BLOCKED');
  });

  it('prefers WAF_BLOCKED over llms.txt when challenge shields fire', () => {
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 403,
        headers: {},
        setCookie: [],
        bodySnippet: 'Just a moment',
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: 13,
      },
      llmsTxt: {
        found: true,
        url: 'https://example.com/llms.txt',
        path: '/llms.txt',
        contentType: 'text/plain',
        byteLength: 12,
      },
      shields: {
        detected: true,
        vendor: 'cloudflare_turnstile',
        evidence: ['body:just-a-moment'],
        httpStatus: 403,
      },
    });
    assert.equal(result.action, 'WAF_BLOCKED');
  });

  it('prefers USE_LLMS_TXT when only CDN markers are present', () => {
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 200,
        headers: { 'cf-ray': '1', server: 'cloudflare' },
        setCookie: [],
        bodySnippet: '<html><body><p>Docs</p></body></html>',
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: 40,
      },
      llmsTxt: {
        found: true,
        url: 'https://example.com/llms.txt',
        path: '/llms.txt',
        contentType: 'text/plain',
        byteLength: 12,
      },
      shields: {
        detected: false,
        vendor: null,
        evidence: ['cdn:cf-ray', 'cdn:server:cloudflare'],
        httpStatus: 200,
      },
    });
    assert.equal(result.action, 'USE_LLMS_TXT');
  });

  it('returns FETCH_RAW for content HTML behind CDN-only markers', () => {
    const html = `<html><body><article>${'hello world '.repeat(30)}</article></body></html>`;
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 200,
        headers: { 'cf-ray': '1' },
        setCookie: [],
        bodySnippet: html,
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: html.length,
      },
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: {
        detected: false,
        vendor: null,
        evidence: ['cdn:cf-ray'],
        httpStatus: 200,
      },
    });
    assert.equal(result.action, 'FETCH_RAW');
  });

  it('returns USE_LLMS_TXT when discovery succeeds', () => {
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 200,
        headers: {},
        setCookie: [],
        bodySnippet: '<html><body><p>Docs</p></body></html>',
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: 40,
      },
      llmsTxt: {
        found: true,
        url: 'https://example.com/llms.txt',
        path: '/llms.txt',
        contentType: 'text/plain',
        byteLength: 12,
      },
      shields: emptyShieldTelemetry(),
    });
    assert.equal(result.action, 'USE_LLMS_TXT');
  });

  it('returns HEADLESS_REQUIRED for SPA shells', () => {
    const shell =
      '<html><body><div id="root"></div><script src="/a.js"></script></body></html>';
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 200,
        headers: {},
        setCookie: [],
        bodySnippet: shell,
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: shell.length,
      },
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: emptyShieldTelemetry(),
    });
    assert.equal(result.action, 'HEADLESS_REQUIRED');
  });

  it('returns FETCH_RAW for clean static HTML', () => {
    const html = `<html><body><article>${'hello world '.repeat(30)}</article></body></html>`;
    const result = synthesizeAction({
      originResult: {
        ok: true,
        status: 200,
        headers: {},
        setCookie: [],
        bodySnippet: html,
        finalUrl: 'https://example.com/',
        contentType: 'text/html',
        byteLength: html.length,
      },
      llmsTxt: emptyLlmsTxtDiscovery(),
      shields: emptyShieldTelemetry(),
    });
    assert.equal(result.action, 'FETCH_RAW');
  });
});

describe('probeUrl', () => {
  it('synthesizes FETCH_RAW from mocked public responses', async () => {
    const html = `<html><body><article>${'content '.repeat(40)}</article></body></html>`;

    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('llms.txt')) {
        return textResponse('not found', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
          url,
        });
      }
      return textResponse(html, { url: 'https://example.com/docs' });
    };

    const result = await probeUrl('https://example.com/docs', {
      lookup: publicLookup,
      fetch: fetchMock,
    });

    assert.equal(result.action, 'FETCH_RAW');
    assert.equal(result.estimatedTokenSavingsPercent, 40);
    assert.ok(result.latencyMs >= 0);
  });

  it('synthesizes USE_LLMS_TXT when llms.txt is present', async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/llms.txt')) {
        return textResponse('# Docs\n', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
          url,
        });
      }
      if (url.includes('well-known')) {
        return textResponse('no', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
          url,
        });
      }
      return textResponse('<html><body>hi</body></html>', {
        url: 'https://example.com/',
      });
    };

    const result = await probeUrl('https://example.com/', {
      lookup: publicLookup,
      fetch: fetchMock,
    });

    assert.equal(result.action, 'USE_LLMS_TXT');
    assert.equal(result.llmsTxt.found, true);
    assert.equal(result.llmsTxt.path, '/llms.txt');
  });

  it('synthesizes WAF_BLOCKED for Cloudflare challenge pages', async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('llms.txt')) {
        return textResponse('no', { status: 404, url });
      }
      return textResponse('<html>Just a moment...</html>', {
        status: 403,
        headers: {
          'content-type': 'text/html',
          'cf-ray': 'xyz',
          'cf-mitigated': 'challenge',
        },
        url: 'https://example.com/',
      });
    };

    const result = await probeUrl('https://example.com/', {
      lookup: publicLookup,
      fetch: fetchMock,
    });

    assert.equal(result.action, 'WAF_BLOCKED');
    assert.equal(result.shields.detected, true);
  });

  it('returns ERROR_UNREACHABLE when the shared signal is already aborted', async () => {
    const fetchMock: typeof fetch = async () => {
      throw new DOMException('The operation was aborted', 'AbortError');
    };

    const result = await probeUrl('https://example.com/', {
      lookup: publicLookup,
      fetch: fetchMock,
    });

    assert.equal(result.action, 'ERROR_UNREACHABLE');
    assert.match(result.reason, /timed out|abort/i);
  });
});
