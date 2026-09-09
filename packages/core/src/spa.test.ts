import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { looksLikeSpaShell } from './spa.js';

describe('looksLikeSpaShell', () => {
  it('flags an empty #root hydration shell', () => {
    const html = `<!doctype html>
<html><head><title>App</title></head>
<body><div id="root"></div>
<script src="/main.js"></script>
</body></html>`;

    assert.equal(looksLikeSpaShell(html, 'text/html'), true);
  });

  it('does not flag content-rich HTML', () => {
    const html = `<!doctype html>
<html><body>
<article>
<h1>Getting started with savemytokens</h1>
<p>${'Substantial documentation text. '.repeat(20)}</p>
</article>
</body></html>`;

    assert.equal(looksLikeSpaShell(html, 'text/html'), false);
  });

  it('does not flag Next.js pages with substantial __NEXT_DATA__', () => {
    const payload = JSON.stringify({
      props: { pageProps: { content: 'x'.repeat(300) } },
    });
    const html = `<!doctype html>
<html><body>
<div id="__next"></div>
<script id="__NEXT_DATA__" type="application/json">${payload}</script>
</body></html>`;

    assert.equal(looksLikeSpaShell(html, 'text/html'), false);
  });
});
