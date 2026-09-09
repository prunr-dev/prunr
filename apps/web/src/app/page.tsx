import { Suspense } from 'react';

import { TriageForm } from '@/components/TriageForm';
import { getApiBaseUrl } from '@/lib/api';
import { WHY_SAVEMYTOKENS_CASES } from '@/lib/why-savemytokens';

/**
 * savemytokens diagnostic workspace — brand-forward Corduroy composition for triage.
 */
export default function HomePage() {
  const apiBase = getApiBaseUrl();

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <header className="animate-rise mb-12 max-w-xl">
        <p className="font-mono text-sm tracking-[0.18em] text-primary uppercase">
          savemytokens.dev
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-base-content sm:text-6xl">
          savemytokens
        </h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-subtle">
          Pre-flight triage for AI agents. Paste a URL to see the cheapest way
          to fetch it — before the crawl burns tokens.
        </p>
      </header>

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

      <section
        className="animate-rise mt-20 max-w-xl border-t border-highlight-high/40 pt-12"
        style={{ animationDelay: '120ms' }}
        aria-labelledby="why-savemytokens-heading"
      >
        <h2
          id="why-savemytokens-heading"
          className="font-display text-2xl font-semibold tracking-tight text-base-content"
        >
          Why try savemytokens
        </h2>
        <p className="mt-3 text-base leading-relaxed text-subtle">
          Three live outcomes from validation — not marketing placeholders.
        </p>
        <ul className="mt-8 flex flex-col gap-6">
          {WHY_SAVEMYTOKENS_CASES.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <a
                href={`/?url=${encodeURIComponent(item.url)}`}
                className="font-mono text-sm text-primary underline-offset-4 hover:underline"
              >
                {item.url.replace(/^https:\/\//, '')}
              </a>
              <p className="text-base leading-relaxed text-subtle">
                <span className="font-mono text-sm text-muted">{item.action}</span>
                {' — '}
                {item.summary}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer
        className="animate-rise mt-16 font-mono text-sm tracking-wide text-muted"
        style={{ animationDelay: '160ms' }}
      >
        Calls <span className="text-subtle">GET /v1/triage</span> on{' '}
        <span className="text-subtle">{apiBase}</span>
        {' · '}
        probe engine: <span className="text-subtle">@savemytokens/core</span>
      </footer>
    </main>
  );
}
