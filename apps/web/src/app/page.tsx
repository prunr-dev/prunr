import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import { SiteNav } from '@/components/SiteNav';
import { TriageForm } from '@/components/TriageForm';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api';

/**
 * Single-page marketing shell: hero → triage → usage → about.
 */
export default function HomePage() {
  const apiBase = getApiBaseUrl();

  return (
    <>
      <SiteNav />

      <main>
        <section
          id="top"
          className="relative flex min-h-svh flex-col justify-center overflow-hidden px-6 pt-(--nav-height) pb-20 sm:px-10"
          aria-labelledby="hero-brand"
        >
          <div
            aria-hidden
            className="hero-orb pointer-events-none absolute -top-24 right-[-10%] h-112 w-md rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary)_22%,transparent)_0%,transparent_68%)] blur-2xl"
          />
          <div
            aria-hidden
            className="hero-orb pointer-events-none absolute bottom-[-8%] left-[-12%] h-88 w-88 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_18%,transparent)_0%,transparent_70%)] blur-2xl"
            style={{ animationDelay: '-7s' }}
          />

          <div className="relative mx-auto w-full max-w-5xl">
            <h1
              id="hero-brand"
              className="animate-hero-fade mt-5 font-display text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl"
              style={{ animationDelay: '120ms' }}
            >
              savemytokens
            </h1>
            <p
              className="animate-hero-fade mt-6 max-w-lg font-sans text-xl leading-relaxed text-subtle sm:text-2xl"
              style={{ animationDelay: '220ms' }}
            >
              Pre-flight triage for AI agents — know the cheapest fetch path
              before the crawl burns tokens.
            </p>
            <div
              className="animate-hero-fade mt-10 flex flex-wrap items-center gap-4"
              style={{ animationDelay: '320ms' }}
            >
              <Button
                asChild
                className="animate-pulse-primary px-6 font-display text-sm font-bold tracking-wide"
              >
                <a href="#triage">Try it live</a>
              </Button>
              <a
                href="#usage"
                className="font-sans text-sm font-medium text-subtle underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                How to use it
              </a>
            </div>
          </div>
        </section>

        <section
          id="triage"
          className="relative scroll-mt-(--nav-height) border-t border-highlight-high/30 px-6 py-24 sm:px-10"
          aria-labelledby="triage-heading"
        >
          <div className="mx-auto w-full max-w-5xl">
            <h2
              id="triage-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Run triage
            </h2>
            <p className="mt-3 max-w-xl font-sans text-lg leading-relaxed text-subtle">
              Paste a URL. Get a recommended action — llms.txt, raw fetch,
              headless, or abort on WAF.
            </p>

            <div className="mt-12">
              <Suspense
                fallback={
                  <div className="flex items-center gap-3 text-subtle">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span className="font-mono text-base">Loading…</span>
                  </div>
                }
              >
                <TriageForm />
              </Suspense>
            </div>
          </div>
        </section>

        <section
          id="usage"
          className="relative scroll-mt-(--nav-height) border-t border-highlight-high/30 px-6 py-24 sm:px-10"
          aria-labelledby="usage-heading"
        >
          <div className="mx-auto w-full max-w-5xl">
            <h2
              id="usage-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Usage
            </h2>
            <p className="mt-3 max-w-2xl font-sans text-lg leading-relaxed text-subtle">
              Call triage before you fetch. Then follow the recommended action
              instead of defaulting to a full HTML crawl or headless browser.
            </p>

            <h3 className="mt-12 font-display text-lg font-bold tracking-tight text-foreground">
              REST
            </h3>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-highlight-high/40 bg-card/60 p-4 font-mono text-sm leading-relaxed text-foreground">
              <code>{`curl "https://api.savemytokens.dev/v1/triage?url=https://example.com"`}</code>
            </pre>

            <h3 className="mt-12 font-display text-lg font-bold tracking-tight text-foreground">
              MCP
            </h3>
            <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-subtle">
              Point Cursor or Claude Desktop at the local stdio server, then ask
              the agent to call{' '}
              <span className="font-mono text-sm text-foreground">
                triage_url
              </span>{' '}
              before fetching a page.{' '}
              <a
                href="https://github.com/savemytokens/savemytokens/blob/main/apps/mcp/README.md"
                className="text-primary underline-offset-4 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                MCP setup guide
              </a>
              .
            </p>

            <h3 className="mt-12 font-display text-lg font-bold tracking-tight text-foreground">
              Why it matters
            </h3>
            <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-subtle">
              Building a small feature often means an agent opens many docs and
              package pages. Triage first: use{' '}
              <span className="font-mono text-sm text-foreground">
                llms.txt
              </span>{' '}
              when it exists, raw GET when HTML is enough, and abort on WAF
              instead of stuffing challenge pages into context. Run{' '}
              <span className="font-mono text-sm text-foreground">
                pnpm ab:triage
              </span>{' '}
              locally for a live with/without session estimate (bytes → tokens
              heuristic — not measured LLM billing).
            </p>

            <h3 className="mt-12 font-display text-lg font-bold tracking-tight text-foreground">
              Follow the action
            </h3>
            <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 font-sans text-base leading-relaxed text-subtle">
              <li>
                <span className="font-mono text-sm text-foreground">
                  USE_LLMS_TXT
                </span>{' '}
                — fetch the discovered Markdown; skip crawling HTML.
              </li>
              <li>
                <span className="font-mono text-sm text-foreground">
                  FETCH_RAW
                </span>{' '}
                — plain HTTP GET is enough; no headless browser.
              </li>
              <li>
                <span className="font-mono text-sm text-foreground">
                  WAF_BLOCKED
                </span>{' '}
                — abort or route to an unblocker before burning proxy
                reputation.
              </li>
            </ul>
          </div>
        </section>

        <section
          id="about"
          className="relative scroll-mt-(--nav-height) border-t border-highlight-high/30 px-6 py-24 sm:px-10"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto w-full max-w-5xl">
            <h2
              id="about-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              About
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-subtle">
              savemytokens is a pre-flight probe for AI web agents. Before
              navigation, it inspects a target URL and returns the cheapest,
              most token-efficient way to fetch content.
            </p>
            <p className="mt-8 font-mono text-sm tracking-wide text-muted-foreground">
              Calls <span className="text-subtle">GET /v1/triage</span> on{' '}
              <span className="text-subtle">{apiBase}</span>
              {' · '}
              probe engine:{' '}
              <span className="text-subtle">@savemytokens/core</span>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-highlight-high/30 px-6 py-8 sm:px-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 font-mono text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} savemytokens</span>
          <a
            href="https://github.com/savemytokens/savemytokens"
            className="text-subtle transition-colors hover:text-primary"
            rel="noreferrer"
            target="_blank"
          >
            github.com/savemytokens/savemytokens
          </a>
        </div>
      </footer>
    </>
  );
}
