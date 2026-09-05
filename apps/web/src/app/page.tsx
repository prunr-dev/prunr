import { TriageForm } from '@/components/TriageForm';

/**
 * Prunr diagnostic workspace — brand-forward single composition for triage.
 */
export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <header className="animate-rise mb-12 max-w-xl">
        <p className="font-mono text-xs tracking-[0.22em] text-signal uppercase">
          prunr.dev
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-paper sm:text-6xl">
          Prunr
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-fog">
          Pre-flight triage for AI agents. Paste a URL to see the cheapest way
          to fetch it — before the crawl burns tokens.
        </p>
      </header>

      <TriageForm />

      <footer className="animate-rise mt-16 font-mono text-[11px] tracking-wide text-mist">
        Calls <span className="text-fog">GET /v1/triage</span> on the local API ·
        probe engine: <span className="text-fog">@prunr-dev/core</span>
      </footer>
    </main>
  );
}
