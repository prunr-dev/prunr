'use client';

import { useState, type FormEvent } from 'react';
import type { TriageAction, TriageResult } from '@prunr-dev/types';

import { fetchTriage, getApiBaseUrl } from '@/lib/api';

const ACTION_LABELS: Record<TriageAction, string> = {
  USE_LLMS_TXT: 'Use llms.txt',
  FETCH_RAW: 'Fetch raw HTML',
  HEADLESS_REQUIRED: 'Headless required',
  WAF_BLOCKED: 'WAF blocked',
  ERROR_UNREACHABLE: 'Unreachable',
};

/**
 * Diagnostic form: submit a URL, display TriageResult or RFC 7807 problem.
 */
export function TriageForm() {
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetchTriage(url.trim());
      if (!response.ok) {
        setResult(null);
        setError(
          response.problem.detail ??
            `${response.problem.title} (${response.problem.status})`,
        );
        return;
      }
      setResult(response.data);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error
          ? `${err.message} — is the API running at ${getApiBaseUrl()}?`
          : 'Request failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <form
        onSubmit={onSubmit}
        className="animate-rise flex flex-col gap-4"
        style={{ animationDelay: '80ms' }}
      >
        <label className="font-mono text-xs tracking-[0.18em] text-mist uppercase">
          Target URL
          <input
            type="url"
            name="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.example.com"
            className="mt-2 block w-full rounded-none border border-mist/30 bg-ink/60 px-4 py-3 font-mono text-sm text-paper outline-none transition focus:border-signal focus:ring-1 focus:ring-signal"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="animate-pulse-signal self-start border border-signal bg-signal px-6 py-3 font-display text-sm font-semibold tracking-wide text-ink transition hover:bg-paper disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? 'Probing…' : 'Run triage'}
        </button>
      </form>

      {error ? (
        <p
          className="animate-rise border-l-2 border-danger pl-4 font-mono text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {result ? <TriageResultPanel result={result} /> : null}
    </div>
  );
}

function TriageResultPanel({ result }: { result: TriageResult }) {
  return (
    <section
      className="animate-rise border border-mist/25 bg-ink/50 p-6 backdrop-blur-sm"
      style={{ animationDelay: '60ms' }}
      aria-live="polite"
    >
      <p className="font-mono text-xs tracking-[0.18em] text-mist uppercase">
        Recommended action
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-signal">
        {ACTION_LABELS[result.action]}
      </h2>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-fog">
        {result.reason}
      </p>

      <dl className="mt-6 grid gap-4 font-mono text-xs sm:grid-cols-2">
        <Stat label="Token savings" value={`${result.estimatedTokenSavingsPercent}%`} />
        <Stat label="Latency" value={`${result.latencyMs} ms`} />
        <Stat label="llms.txt" value={result.llmsTxt.found ? 'found' : 'not found'} />
        <Stat
          label="Shields"
          value={
            result.shields.detected
              ? (result.shields.vendor ?? 'detected')
              : 'none'
          }
        />
      </dl>

      <p className="mt-6 truncate font-mono text-[11px] text-mist">
        {result.url}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-mist/20 pt-3">
      <dt className="text-mist">{label}</dt>
      <dd className="mt-1 text-sm text-paper">{value}</dd>
    </div>
  );
}
