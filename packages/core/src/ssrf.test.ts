import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isDisallowedIp, validateProbeTarget } from './ssrf.js';

describe('isDisallowedIp', () => {
  it('blocks loopback, RFC1918, link-local, and metadata IPv4', () => {
    assert.equal(isDisallowedIp('127.0.0.1'), true);
    assert.equal(isDisallowedIp('10.0.0.5'), true);
    assert.equal(isDisallowedIp('172.16.1.1'), true);
    assert.equal(isDisallowedIp('172.31.255.255'), true);
    assert.equal(isDisallowedIp('192.168.1.1'), true);
    assert.equal(isDisallowedIp('169.254.169.254'), true);
    assert.equal(isDisallowedIp('0.0.0.0'), true);
  });

  it('allows public IPv4', () => {
    assert.equal(isDisallowedIp('1.1.1.1'), false);
    assert.equal(isDisallowedIp('8.8.8.8'), false);
    assert.equal(isDisallowedIp('172.32.0.1'), false);
  });

  it('blocks IPv6 loopback, link-local, and ULA', () => {
    assert.equal(isDisallowedIp('::1'), true);
    assert.equal(isDisallowedIp('fe80::1'), true);
    assert.equal(isDisallowedIp('fc00::1'), true);
    assert.equal(isDisallowedIp('fd12:3456:789a::1'), true);
  });

  it('blocks IPv4-mapped private addresses', () => {
    assert.equal(isDisallowedIp('::ffff:10.0.0.1'), true);
    assert.equal(isDisallowedIp('::ffff:192.168.0.1'), true);
    assert.equal(isDisallowedIp('::ffff:1.1.1.1'), false);
  });
});

describe('validateProbeTarget', () => {
  it('rejects invalid URLs and non-http protocols', async () => {
    const bad = await validateProbeTarget('not a url');
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.equal(bad.code, 'INVALID_URL');
    }

    const ftp = await validateProbeTarget('ftp://example.com/');
    assert.equal(ftp.ok, false);
    if (!ftp.ok) {
      assert.equal(ftp.code, 'SSRF_BLOCKED');
      assert.match(ftp.reason, /Only http/i);
    }
  });

  it('rejects localhost hostnames without DNS', async () => {
    const result = await validateProbeTarget('http://localhost/path');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'SSRF_BLOCKED');
      assert.match(result.reason, /disallowed/i);
    }
  });

  it('rejects private DNS answers', async () => {
    const result = await validateProbeTarget('https://evil.example/', {
      lookup: async () => [{ address: '10.0.0.1', family: 4 }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'SSRF_BLOCKED');
    }
  });

  it('rejects metadata DNS answers', async () => {
    const result = await validateProbeTarget('https://meta.example/', {
      lookup: async () => [{ address: '169.254.169.254', family: 4 }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'SSRF_BLOCKED');
    }
  });

  it('fails closed on DNS lookup errors', async () => {
    const result = await validateProbeTarget('https://missing.example/', {
      lookup: async () => {
        throw new Error('ENOTFOUND');
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'DNS_FAILURE');
    }
  });

  it('allows public hosts', async () => {
    const result = await validateProbeTarget('https://example.com/docs', {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.url.hostname, 'example.com');
    }
  });
});
