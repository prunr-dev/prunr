# savemytokens, explained simply (ELI5)

savemytokens answers one question for AI agents:

> **Before I fetch this URL the hard way, what’s the smartest cheap way to get the content?**

---

## The big picture

Think of a restaurant kitchen:

| Piece                  | Role                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| **`@savemytokens/core`**  | The chef — does the actual tasting/inspecting                                |
| **`@savemytokens/types`** | The menu — shared words everyone agrees on (`TriageResult`, actions, errors) |
| **`@savemytokens/api`**   | The counter — HTTP so browsers and curl can order                            |
| **`@savemytokens/web`**   | The display board — pretty UI to try it                                      |
| **`@savemytokens/mcp`**   | A private waiter for Cursor/Claude — same kitchen, different door            |

Only the chef (`core`) decides. API / web / MCP just take orders and show the answer.

---

## What a “triage” is

You give it a URL. It comes back with one of these **actions**:

1. **`USE_LLMS_TXT`** — site already publishes clean Markdown for AIs → use that
2. **`FETCH_RAW`** — normal HTML, no bot wall → plain HTTP GET is enough
3. **`HEADLESS_REQUIRED`** — empty React/SPA shell → need a real browser
4. **`WAF_BLOCKED`** — Cloudflare/DataDome challenge → don’t burn proxies yet
5. **`ERROR_UNREACHABLE`** — timed out, DNS failed, bad/private URL, etc.

Plus extras: reason, byte-heuristic `tokenEstimate` (baseline → action tokens + derived %), latency, whether `llms.txt` was found, shield clues.

---

## How `core` decides (the chef’s steps)

```text
URL in
  → A. Is this safe? (no localhost / private IPs / weird protocols)
  → B. In parallel (max ~2 seconds):
        • GET the page (only first ~4KB)
        • Look for /llms.txt and /.well-known/llms.txt
  → C. Sniff for bot walls (headers, cookies, “Just a moment…”)
  → D. Pick the highest-priority action and return TriageResult
```

**Priority (first match wins):**  
unreachable → WAF → llms.txt → SPA shell → else fetch raw

SSRF guard = “don’t let strangers make us probe your home router.” If DNS says the host is private/metadata, we refuse.

---

## How the API works (the counter)

`GET /v1/triage?url=https://example.com`

Roughly:

1. **CORS** — browsers on allowed sites (localhost / savemytokens.dev) can call it
2. **Rate limit** (if Upstash Redis is configured) — ~30 requests/IP/minute; over = `429`
3. **Cache** (same Redis) — same URL within ~60s → reuse last answer (`X-Savemytokens-Cache: HIT`)
4. Call `probeUrl()` in core
5. Return JSON
   - Normal decisions → **200** + `TriageResult`
   - Bad/private URL → **400** problem JSON
   - Too many requests → **429**

`GET /health` — “am I alive?” + version.

Without Redis, rate limit and cache quietly skip (local demos still work).

There’s also a **Vercel** entry so this can run in the cloud, not only on your laptop (`PORT 8787`).

---

## How the web UI works

1. You type (or click a preset) URL
2. Browser calls the API (`NEXT_PUBLIC_SAVEMYTOKENS_API_URL`)
3. Shows the action, reason, badges, shields, etc.

Skin: **daisyUI** + the **Corduroy** color palette. Motion uses soft “rise” / pulse animations.  
`?url=` in the address bar makes demos shareable.

Web never runs probes itself — only the API does.

---

## How MCP works

Cursor can call tool `triage_url` over stdio. Same `probeUrl()` as the API. No browser, no Redis layer — local IDE helper. For “try without installing MCP,” use the hosted REST API instead.

---

## What’s built vs still ahead

### Built

- Live probing in core + tests
- REST API with CORS, optional cache/rate limit, Vercel wiring
- Corduroy web visualizer
- Local MCP
- Docs + CI workflow

### Not done yet (backlog)

- Deploying to savemytokens.dev / api.savemytokens.dev (Vercel project config)
- OpenAPI + Scalar
- API keys / billing
- Publishing packages to npm
- Remote MCP over HTTP

---

## Tiny mental model

> **Web/MCP/curl ask → API (optional gate + memory) → core peeks at the internet for 2s → one recommendation comes back.**

That’s the whole product.

For denser architecture notes, see [architecture.md](./architecture.md).
