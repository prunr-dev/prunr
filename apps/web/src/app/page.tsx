import { Suspense } from 'react';

import { SiteNav } from '@/components/SiteNav';
import { TriageForm } from '@/components/TriageForm';
import { getApiBaseUrl } from '@/lib/api';

/**
 * Single-page marketing shell: hero → triage workspace → about.
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
            className="hero-orb pointer-events-none absolute -top-24 right-[-10%] h-112 w-md rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-primary)_22%,transparent)_0%,transparent_68%)] blur-2xl"
          />
          <div
            aria-hidden
            className="hero-orb pointer-events-none absolute bottom-[-8%] left-[-12%] h-88 w-88 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_18%,transparent)_0%,transparent_70%)] blur-2xl"
            style={{ animationDelay: '-7s' }}
          />

          <div className="relative mx-auto w-full max-w-5xl">
            <h1
              id="hero-brand"
              className="animate-hero-fade mt-5 font-display text-5xl font-bold tracking-tight text-base-content sm:text-7xl lg:text-8xl"
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
              <a
                href="#triage"
                className="btn btn-primary animate-pulse-primary px-6 font-display text-sm font-bold tracking-wide"
              >
                Try it live
              </a>
              <a
                href="#about"
                className="font-sans text-sm font-medium text-subtle underline-offset-4 transition-colors hover:text-base-content hover:underline"
              >
                How it works
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
              className="font-display text-3xl font-bold tracking-tight text-base-content sm:text-4xl"
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
                    <span className="loading loading-spinner loading-sm" />
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
          id="about"
          className="relative scroll-mt-(--nav-height) border-t border-highlight-high/30 px-6 py-24 sm:px-10"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto w-full max-w-5xl">
            <h2
              id="about-heading"
              className="font-display text-3xl font-bold tracking-tight text-base-content sm:text-4xl"
            >
              About
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-subtle">
              savemytokens is an ultra-fast pre-flight probe for AI web agents.
              Before navigation, it inspects a target URL and returns the
              cheapest, fastest, most token-efficient way to fetch content.
            </p>
            <p className="mt-8 font-mono text-sm tracking-wide text-muted">
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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 font-mono text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
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
