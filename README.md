# savemytokens

Pre-flight triage for AI web agents.

Before an agent fetches a URL, savemytokens inspects it and recommends the cheapest way to get the content:

| Action              | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| `USE_LLMS_TXT`      | Domain publishes curated Markdown — skip HTML crawl    |
| `FETCH_RAW`         | Static HTML, no bot wall — plain HTTP GET is enough    |
| `HEADLESS_REQUIRED` | Empty SPA shell — needs a browser engine               |
| `WAF_BLOCKED`       | Edge bot shield detected — abort or route to unblocker |
| `ERROR_UNREACHABLE` | Timeout, DNS failure, SSRF block, or network error     |

**Site:** [savemytokens.vercel.app](https://savemytokens.vercel.app) · **Repo:** [savemytokens/savemytokens](https://github.com/savemytokens/savemytokens)

## Try it

```bash
curl "https://api.savemytokens.dev/v1/triage?url=https://example.com"
```

Or open the visualizer at [savemytokens.vercel.app](https://savemytokens.vercel.app).

## Use with an IDE agent (MCP)

Connect the local MCP server so agents can call `triage_url` before fetching pages.

Setup: [`apps/mcp/README.md`](apps/mcp/README.md)

## Develop locally

Requires **Node.js 24** (see `.node-version`) and **pnpm 10+**.

```bash
pnpm install
pnpm build
pnpm --filter @savemytokens/api dev    # http://localhost:8787
pnpm --filter @savemytokens/web dev    # http://localhost:3000
```

## Learn more

- [Architecture](docs/architecture.md) — how packages fit together
- [ELI5](docs/eli5.md) — plain-language walkthrough
- Package docs: [`types`](packages/types/README.md) · [`core`](packages/core/README.md) · [`api`](apps/api/README.md) · [`mcp`](apps/mcp/README.md) · [`web`](apps/web/README.md)
