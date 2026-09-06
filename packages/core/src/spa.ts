/**
 * Conservative SPA / empty-shell detection for `HEADLESS_REQUIRED`.
 *
 * False positives should lean toward `FETCH_RAW` (return false).
 * Only flags pages that look like client-hydration shells with little
 * useful HTML text for a raw GET.
 *
 * Signals (any strong combination):
 * - HTML content-type (or missing type with HTML-looking markup)
 * - Root mounts: `id="root"`, `id="app"`, `id="__next"`
 * - Very low visible-text-to-tag ratio with substantial `<script>` presence
 * - Absence of meaningful `__NEXT_DATA__` payload / static article text
 *
 * @param bodySnippet - Capped UTF-8 body from the origin GET
 * @param contentType - Response Content-Type, if any
 */
export function looksLikeSpaShell(
  bodySnippet: string | null | undefined,
  contentType: string | null | undefined,
): boolean {
  const body = bodySnippet ?? '';
  if (body.trim().length === 0) {
    return false;
  }

  if (!isHtmlLike(body, contentType)) {
    return false;
  }

  const lower = body.toLowerCase();

  // Next.js with embedded JSON payload usually has crawlable content hints.
  const hasNextData = lower.includes('__next_data__');
  if (hasNextData && extractNextDataLength(body) > 200) {
    return false;
  }

  const hasRootMount =
    /id\s*=\s*["']root["']/i.test(body) ||
    /id\s*=\s*["']app["']/i.test(body) ||
    /id\s*=\s*["']__next["']/i.test(body);

  const scriptTags = countTag(lower, 'script');
  const textLength = approximateVisibleTextLength(body);
  const tagChars = (body.match(/<[^>]+>/g) ?? []).join('').length;
  const textToTagRatio =
    tagChars === 0 ? textLength : textLength / Math.max(tagChars, 1);

  // Empty mount + scripts, or extremely markup-heavy with almost no text.
  if (hasRootMount && scriptTags >= 1 && textLength < 80) {
    return true;
  }

  if (scriptTags >= 2 && textLength < 40 && textToTagRatio < 0.15) {
    return true;
  }

  return false;
}

function isHtmlLike(
  body: string,
  contentType: string | null | undefined,
): boolean {
  const media =
    contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (media.includes('html')) {
    return true;
  }
  if (media !== '' && !media.includes('text/') && !media.includes('json')) {
    return false;
  }
  return /<html[\s>]|<body[\s>]|<div[\s>]/i.test(body);
}

function countTag(lowerBody: string, tag: string): number {
  const re = new RegExp(`<${tag}\\b`, 'g');
  return lowerBody.match(re)?.length ?? 0;
}

function approximateVisibleTextLength(html: string): number {
  const withoutScripts = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const text = withoutScripts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length;
}

function extractNextDataLength(body: string): number {
  const match = body.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  return match?.[1]?.trim().length ?? 0;
}
