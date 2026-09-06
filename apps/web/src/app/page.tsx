import { Suspense } from 'react';

import { TriageForm } from '@/components/TriageForm';
import { getApiBaseUrl } from '@/lib/api';

/**
 * Prunr diagnostic workspace — brand-forward Corduroy composition for triage.
 */
export default function HomePage() {
  const apiBase = getApiBaseUrl();

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <header className="animate-rise mb-12 max-w-xl">
        <p className="font-mono text-sm tracking-[0.18em] text-primary uppercase">
          prunr.dev
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-base-content sm:text-6xl">
          prunr
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

      <footer
        className="animate-rise mt-16 font-mono text-sm tracking-wide text-muted"
        style={{ animationDelay: '160ms' }}
      >
        Calls <span className="text-subtle">GET /v1/triage</span> on{' '}
        <span className="text-subtle">{apiBase}</span>
        {' · '}
        probe engine: <span className="text-subtle">@prunr-dev/core</span>
      </footer>
    </main>
  );
}
