/** Max bytes retained from a response body for heuristics. */
export const BODY_SNIPPET_MAX_BYTES = 4096 as const;

/** User-Agent sent on all outbound probe requests. */
export const SAVEMYTOKENS_USER_AGENT = 'savemytokens/0.1 (+https://savemytokens.dev)' as const;

export type OriginFetchSuccess = {
  ok: true;
  status: number;
  /** Lowercased single-value header map (first value wins). */
  headers: Record<string, string>;
  /** Raw Set-Cookie header values when present. */
  setCookie: string[];
  /** UTF-8 decoded body, capped at {@link BODY_SNIPPET_MAX_BYTES}. */
  bodySnippet: string;
  /** Final URL after redirects. */
  finalUrl: string;
  /** Lowercased Content-Type header value, or null. */
  contentType: string | null;
  /** Bytes observed in the capped read. */
  byteLength: number;
};

export type OriginFetchFailure = {
  ok: false;
  error: 'timeout' | 'network';
  reason: string;
};

export type OriginFetchResult = OriginFetchSuccess | OriginFetchFailure;

export interface FetchOriginOptions {
  /** Override `globalThis.fetch` (tests). */
  fetch?: typeof globalThis.fetch;
}

/**
 * Low-level GET used by origin and llms.txt probes.
 *
 * Never throws: abort → `timeout`, other failures → `network`.
 */
export async function fetchOrigin(
  url: string | URL,
  signal: AbortSignal,
  options?: FetchOriginOptions,
): Promise<OriginFetchResult> {
  const fetchFn = options?.fetch ?? globalThis.fetch;

  if (signal.aborted) {
    return {
      ok: false,
      error: 'timeout',
      reason: 'Probe aborted before the request started (timeout).',
    };
  }

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      redirect: 'follow',
      signal,
      headers: {
        Accept: 'text/html,text/plain,text/markdown,*/*;q=0.8',
        'User-Agent': SAVEMYTOKENS_USER_AGENT,
      },
    });
  } catch (err) {
    if (isAbortError(err) || signal.aborted) {
      return {
        ok: false,
        error: 'timeout',
        reason: 'Probe timed out waiting for the origin response.',
      };
    }
    const message =
      err instanceof Error ? err.message : 'Unknown network error';
    return {
      ok: false,
      error: 'network',
      reason: `Network error while fetching origin: ${message}`,
    };
  }

  const headers = flattenHeaders(response.headers);
  const setCookie = readSetCookie(response.headers);
  const contentType = headers['content-type'] ?? null;

  let bodySnippet = '';
  let byteLength = 0;
  try {
    const read = await readBodySnippet(response.body, BODY_SNIPPET_MAX_BYTES);
    bodySnippet = read.text;
    byteLength = read.byteLength;
  } catch (err) {
    if (isAbortError(err) || signal.aborted) {
      return {
        ok: false,
        error: 'timeout',
        reason: 'Probe timed out while reading the origin body.',
      };
    }
    const message = err instanceof Error ? err.message : 'Unknown read error';
    return {
      ok: false,
      error: 'network',
      reason: `Network error while reading origin body: ${message}`,
    };
  }

  return {
    ok: true,
    status: response.status,
    headers,
    setCookie,
    bodySnippet,
    finalUrl: response.url || url.toString(),
    contentType,
    byteLength,
  };
}

function flattenHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!(lower in out)) {
      out[lower] = value;
    }
  });
  return out;
}

function readSetCookie(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function readBodySnippet(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<{ text: string; byteLength: number }> {
  if (!body) {
    return { text: '', byteLength: 0 };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done || value === undefined) {
        break;
      }
      const remaining = maxBytes - received;
      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, remaining));
        received = maxBytes;
        break;
      }
      chunks.push(value);
      received += value.byteLength;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancel errors after a partial read or abort.
    }
  }

  const merged = concatUint8(chunks, received);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(merged);
  return { text, byteLength: received };
}

function concatUint8(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      err instanceof DOMException &&
      err.name === 'AbortError')
  );
}
