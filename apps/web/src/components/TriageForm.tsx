'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TriageAction, TriageResult } from '@prunr-dev/types';

import { fetchTriage, getApiBaseUrl } from '@/lib/api';
import { DEMO_PRESETS } from '@/lib/presets';

const ACTION_LABELS: Record<TriageAction, string> = {
  USE_LLMS_TXT: 'Use llms.txt',
  FETCH_RAW: 'Fetch raw HTML',
  HEADLESS_REQUIRED: 'Headless required',
  WAF_BLOCKED: 'WAF blocked',
  ERROR_UNREACHABLE: 'Unreachable',
};

const ACTION_BADGE: Record<TriageAction, string> = {
  USE_LLMS_TXT: 'badge-secondary',
  FETCH_RAW: 'badge-accent',
  HEADLESS_REQUIRED: 'badge-info',
  WAF_BLOCKED: 'badge-warning',
  ERROR_UNREACHABLE: 'badge-error',
};

const DEFAULT_URL = 'https://example.com';

/**
 * Diagnostic form: submit a URL, display TriageResult or RFC 7807 problem.
 */
export function TriageForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('url')?.trim() ?? '';

  const [url, setUrl] = useState(initialQuery || DEFAULT_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const autoRan = useRef(false);

  const syncUrlParam = useCallback(
    (nextUrl: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextUrl.trim()) {
        params.set('url', nextUrl.trim());
      } else {
        params.delete('url');
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const runTriage = useCallback(
    async (target: string) => {
      const trimmed = target.trim();
      if (!trimmed) {
        return;
      }
      setLoading(true);
      setError(null);
      setUrl(trimmed);
      syncUrlParam(trimmed);

      try {
        const response = await fetchTriage(trimmed);
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
    },
    [syncUrlParam],
  );

  useEffect(() => {
    if (autoRan.current) {
      return;
    }
    const fromQuery = searchParams.get('url')?.trim();
    if (!fromQuery) {
      return;
    }
    autoRan.current = true;
    void runTriage(fromQuery);
  }, [runTriage, searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runTriage(url);
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <div
        className="animate-rise flex flex-wrap gap-2"
        style={{ animationDelay: '40ms' }}
      >
        {DEMO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="btn btn-sm btn-ghost border border-highlight-high/60 font-mono text-sm tracking-wide text-subtle"
            onClick={() => void runTriage(preset.url)}
            disabled={loading}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="animate-rise flex flex-col gap-4"
        style={{ animationDelay: '80ms' }}
      >
        <label className="form-control w-full">
          <span className="label px-0">
            <span className="label-text font-mono text-sm tracking-[0.14em] text-subtle uppercase">
              Target URL
            </span>
          </span>
          <div className="join w-full">
            <input
              type="url"
              name="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.example.com"
              className="input join-item input-bordered w-full min-w-0 font-mono text-base"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary join-item animate-pulse-primary min-w-28 font-display"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                'Run triage'
              )}
            </button>
          </div>
        </label>
      </form>

      {error ? (
        <div
          className="alert alert-error animate-rise text-base"
          style={{ animationDelay: '40ms' }}
          role="alert"
        >
          <span className="font-mono">{error}</span>
        </div>
      ) : null}

      {result ? <TriageResultPanel result={result} /> : null}
    </div>
  );
}

function TriageResultPanel({ result }: { result: TriageResult }) {
  return (
    <section
      className="animate-rise rounded-box border border-highlight-high/50 bg-base-200/80 p-6"
      style={{ animationDelay: '100ms' }}
      aria-live="polite"
    >
      <p className="font-mono text-sm tracking-[0.14em] text-subtle uppercase">
        Recommended action
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-primary">
          {ACTION_LABELS[result.action]}
        </h2>
        <span className={`badge ${ACTION_BADGE[result.action]} badge-outline`}>
          {result.action}
        </span>
      </div>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-base-content/85">
        {result.reason}
      </p>

      <dl className="mt-6 grid gap-4 font-mono text-sm sm:grid-cols-2">
        <Stat
          label="Token savings"
          value={`${result.estimatedTokenSavingsPercent}%`}
        />
        <Stat label="Latency" value={`${result.latencyMs} ms`} />
        <Stat
          label="llms.txt"
          value={
            result.llmsTxt.found
              ? (result.llmsTxt.path ?? 'found')
              : 'not found'
          }
        />
        <Stat
          label="Shields"
          value={
            result.shields.detected
              ? (result.shields.vendor ?? 'detected')
              : 'none'
          }
        />
      </dl>

      {result.llmsTxt.found && result.llmsTxt.url ? (
        <p className="mt-4 font-mono text-sm break-all">
          <a
            href={result.llmsTxt.url}
            target="_blank"
            rel="noreferrer"
            className="link link-secondary"
          >
            {result.llmsTxt.url}
          </a>
        </p>
      ) : null}

      {result.shields.detected && result.shields.evidence.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {result.shields.evidence.map((item) => (
            <span key={item} className="badge badge-neutral font-mono text-sm">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-6 truncate font-mono text-sm text-muted">{result.url}</p>
      <p className="mt-1 font-mono text-xs text-muted">
        probed {result.probedAt}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-highlight-high/40 pt-3">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 text-base text-base-content">{value}</dd>
    </div>
  );
}
