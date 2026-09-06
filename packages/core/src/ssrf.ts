import { promises as dns } from 'node:dns';

import type { ProbeErrorCode } from '@prunr-dev/types';

/**
 * Outcome of Step A (SSRF / protocol sanitation).
 */
export type SsrfValidationResult =
  { ok: true; url: URL } | { ok: false; code: ProbeErrorCode; reason: string };

/**
 * DNS lookup compatible with `dns.promises.lookup(..., { all: true })`.
 * Injectable for unit tests.
 */
export type DnsLookupFn = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<ReadonlyArray<{ address: string; family: number }>>;

export interface ValidateProbeTargetOptions {
  /** Override DNS resolution (defaults to `dns.promises.lookup`). */
  lookup?: DnsLookupFn;
}

/**
 * Returns true when `address` must never be probed (loopback, private,
 * link-local, ULA, metadata, or IPv4-mapped equivalents).
 */
export function isDisallowedIp(address: string): boolean {
  const normalized = normalizeIpLiteral(address);
  if (normalized === null) {
    return true;
  }

  if (normalized.kind === 'ipv4') {
    return isDisallowedIpv4(normalized.octets);
  }

  return isDisallowedIpv6(normalized.groups);
}

/**
 * Parses and sanitizes a candidate URL for probing.
 *
 * Rules:
 * - Protocol must be `http:` or `https:` only.
 * - Host must not be `localhost` / `*.local`.
 * - Resolved addresses must not be loopback, RFC1918, link-local,
 *   IPv6 ULA, or cloud metadata (`169.254.169.254`).
 *
 * @param input - Raw URL string from an agent or API caller
 * @param options - Optional DNS lookup override for tests
 * @returns Normalized `URL` on success, or a fail-closed error code
 */
export async function validateProbeTarget(
  input: string,
  options?: ValidateProbeTargetOptions,
): Promise<SsrfValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return {
      ok: false,
      code: 'INVALID_URL',
      reason: 'URL could not be parsed.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      code: 'SSRF_BLOCKED',
      reason: 'Only http and https protocols are allowed.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.local')) {
    return {
      ok: false,
      code: 'SSRF_BLOCKED',
      reason: 'Target host is disallowed (loopback, local, or metadata).',
    };
  }

  // Literal IPs in the hostname: deny before DNS.
  if (isIpLiteral(host) && isDisallowedIp(host)) {
    return {
      ok: false,
      code: 'SSRF_BLOCKED',
      reason: 'Target host is disallowed (loopback, local, or metadata).',
    };
  }

  const lookupFn = options?.lookup ?? defaultLookup;

  let records: ReadonlyArray<{ address: string; family: number }>;
  try {
    records = await lookupFn(host, { all: true, verbatim: true });
  } catch {
    return {
      ok: false,
      code: 'DNS_FAILURE',
      reason: 'DNS lookup failed for the target host.',
    };
  }

  if (records.length === 0) {
    return {
      ok: false,
      code: 'DNS_FAILURE',
      reason: 'DNS lookup returned no addresses for the target host.',
    };
  }

  for (const record of records) {
    if (isDisallowedIp(record.address)) {
      return {
        ok: false,
        code: 'SSRF_BLOCKED',
        reason: 'Target host is disallowed (loopback, local, or metadata).',
      };
    }
  }

  return { ok: true, url: parsed };
}

async function defaultLookup(
  hostname: string,
  options: { all: true; verbatim: true },
): Promise<ReadonlyArray<{ address: string; family: number }>> {
  return dns.lookup(hostname, options);
}

function isIpLiteral(host: string): boolean {
  return normalizeIpLiteral(host) !== null;
}

type NormalizedIp =
  | { kind: 'ipv4'; octets: [number, number, number, number] }
  | { kind: 'ipv6'; groups: number[] };

function normalizeIpLiteral(address: string): NormalizedIp | null {
  const trimmed = address.trim().toLowerCase();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return normalizeIpLiteral(trimmed.slice(1, -1));
  }

  if (trimmed.includes('.')) {
    // IPv4-mapped IPv6: ::ffff:a.b.c.d
    const mapped = trimmed.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped?.[1] !== undefined) {
      const octets = parseIpv4(mapped[1]);
      return octets ? { kind: 'ipv4', octets } : null;
    }

    const octets = parseIpv4(trimmed);
    return octets ? { kind: 'ipv4', octets } : null;
  }

  if (trimmed.includes(':')) {
    const groups = parseIpv6(trimmed);
    return groups ? { kind: 'ipv6', groups } : null;
  }

  return null;
}

function parseIpv4(value: string): [number, number, number, number] | null {
  const parts = value.split('.');
  if (parts.length !== 4) {
    return null;
  }
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      return null;
    }
    octets.push(n);
  }
  return octets as [number, number, number, number];
}

/**
 * Expands an IPv6 literal into 8 hextets (0–65535).
 * Handles `::` compression and IPv4-tail forms already peeled in normalize.
 */
function parseIpv6(value: string): number[] | null {
  if (value === '::') {
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }

  const sides = value.split('::');
  if (sides.length > 2) {
    return null;
  }

  const parseSide = (side: string): number[] | null => {
    if (side === '') {
      return [];
    }
    const parts = side.split(':');
    const out: number[] = [];
    for (const part of parts) {
      if (!/^[0-9a-f]{1,4}$/i.test(part)) {
        return null;
      }
      out.push(Number.parseInt(part, 16));
    }
    return out;
  };

  if (sides.length === 1) {
    const groups = parseSide(sides[0] ?? '');
    return groups?.length === 8 ? groups : null;
  }

  const head = parseSide(sides[0] ?? '');
  const tail = parseSide(sides[1] ?? '');
  if (head === null || tail === null) {
    return null;
  }
  const missing = 8 - head.length - tail.length;
  if (missing < 1) {
    return null;
  }
  return [...head, ...Array<number>(missing).fill(0), ...tail];
}

function isDisallowedIpv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;

  // 0.0.0.0/8
  if (a === 0) {
    return true;
  }
  // 127.0.0.0/8 loopback
  if (a === 127) {
    return true;
  }
  // 10.0.0.0/8
  if (a === 10) {
    return true;
  }
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  // 192.168.0.0/16
  if (a === 192 && b === 168) {
    return true;
  }
  // 169.254.0.0/16 link-local + metadata
  if (a === 169 && b === 254) {
    return true;
  }

  return false;
}

function isDisallowedIpv6(groups: number[]): boolean {
  if (groups.length !== 8) {
    return true;
  }

  // ::1 loopback
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0 &&
    groups[6] === 0 &&
    groups[7] === 1
  ) {
    return true;
  }

  // Unspecified ::
  if (groups.every((g) => g === 0)) {
    return true;
  }

  // fe80::/10 link-local
  const g0 = groups[0] ?? 0;
  if ((g0 & 0xffc0) === 0xfe80) {
    return true;
  }

  // fc00::/7 unique local
  if ((g0 & 0xfe00) === 0xfc00) {
    return true;
  }

  // IPv4-mapped ::ffff:0:0/96 — check embedded IPv4
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff
  ) {
    const hi = groups[6] ?? 0;
    const lo = groups[7] ?? 0;
    const octets: [number, number, number, number] = [
      (hi >> 8) & 0xff,
      hi & 0xff,
      (lo >> 8) & 0xff,
      lo & 0xff,
    ];
    return isDisallowedIpv4(octets);
  }

  return false;
}
