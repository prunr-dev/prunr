'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { TriageAction, TriageResult } from '@savemytokens/types';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchTriage, getApiBaseUrl } from '@/lib/api';
import { DEMO_PRESETS } from '@/lib/presets';

const ACTION_LABELS: Record<TriageAction, string> = {
  USE_LLMS_TXT: 'Use llms.txt',
  FETCH_RAW: 'Fetch raw HTML',
  HEADLESS_REQUIRED: 'Headless required',
  WAF_BLOCKED: 'WAF blocked',
  ERROR_UNREACHABLE: 'Unreachable',
};

const ACTION_BADGE: Record<
  TriageAction,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  USE_LLMS_TXT: 'secondary',
  FETCH_RAW: 'default',
  HEADLESS_REQUIRED: 'outline',
  WAF_BLOCKED: 'destructive',
  ERROR_UNREACHABLE: 'destructive',
};

const DEFAULT_URL = 'https://example.com';

const tokenChartConfig = {
  tokens: {
    label: 'Tokens',
  },
  baseline: {
    label: 'Baseline',
    color: 'var(--chart-2)',
  },
  action: {
    label: 'Action path',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

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
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            className="border-highlight-high/60 font-mono text-sm tracking-wide text-muted-foreground"
            onClick={() => void runTriage(preset.url)}
            disabled={loading}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="animate-rise flex flex-col gap-4"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex w-full flex-col gap-2">
          <Label
            htmlFor="triage-url"
            className="font-mono text-sm tracking-[0.14em] text-muted-foreground uppercase"
          >
            Target URL
          </Label>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
            <Input
              id="triage-url"
              type="url"
              name="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.example.com"
              className="min-w-0 flex-1 font-mono text-base"
            />
            <Button
              type="submit"
              disabled={loading}
              className="animate-pulse-primary min-w-28 font-display text-sm font-bold tracking-wide sm:self-stretch"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                'Run triage'
              )}
            </Button>
          </div>
        </div>
      </form>

      {error ? (
        <Alert
          variant="destructive"
          className="animate-rise"
          style={{ animationDelay: '40ms' }}
        >
          <AlertDescription className="font-mono text-base">
            {error}
          </AlertDescription>
        </Alert>
      ) : null}

      {result ? <TriageResultPanel result={result} /> : null}
    </div>
  );
}

function TriageResultPanel({ result }: { result: TriageResult }) {
  const chartData = useMemo(
    () => [
      {
        stage: 'baseline',
        label: 'Baseline',
        tokens: result.tokenEstimate.baselineTokens,
        fill: 'var(--color-baseline)',
      },
      {
        stage: 'action',
        label: 'Action',
        tokens: result.tokenEstimate.actionTokens,
        fill: 'var(--color-action)',
      },
    ],
    [result.tokenEstimate.actionTokens, result.tokenEstimate.baselineTokens],
  );

  return (
    <Card
      className="animate-rise border-highlight-high/50 bg-card/80"
      style={{ animationDelay: '100ms' }}
      aria-live="polite"
    >
      <CardHeader>
        <CardDescription className="font-mono text-sm tracking-[0.14em] text-muted-foreground uppercase">
          Recommended action
        </CardDescription>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="font-display text-3xl font-semibold tracking-tight text-primary">
            {ACTION_LABELS[result.action]}
          </CardTitle>
          <Badge variant={ACTION_BADGE[result.action]} className="font-mono">
            {result.action}
          </Badge>
        </div>
        <p className="max-w-prose text-base leading-relaxed text-foreground/85">
          {result.reason}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            Token estimate (baseline vs action path)
          </p>
          <ChartContainer
            config={tokenChartConfig}
            className="mt-3 aspect-[2.4/1] w-full"
            initialDimension={{ width: 480, height: 160 }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={72}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="tokens" radius={6}>
                {chartData.map((entry) => (
                  <Cell key={entry.stage} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        <dl className="grid gap-4 font-mono text-sm sm:grid-cols-2">
          <Stat
            label="Est. token savings"
            value={`${result.tokenEstimate.savingsPercent}%`}
          />
          <Stat
            label="Tokens (baseline → action)"
            value={formatTokenPath(
              result.tokenEstimate.baselineTokens,
              result.tokenEstimate.actionTokens,
            )}
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
          <p className="font-mono text-sm break-all">
            <a
              href={result.llmsTxt.url}
              target="_blank"
              rel="noreferrer"
              className="text-secondary underline-offset-4 hover:underline"
            >
              {result.llmsTxt.url}
            </a>
          </p>
        ) : null}

        {result.shields.detected && result.shields.evidence.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.shields.evidence.map((item) => (
              <Badge key={item} variant="outline" className="font-mono text-sm">
                {item}
              </Badge>
            ))}
          </div>
        ) : null}

        <div>
          <p className="truncate font-mono text-sm text-muted-foreground">
            {result.url}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            probed {result.probedAt}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTokenPath(baseline: number, action: number): string {
  return `${formatTokenCount(baseline)} → ${formatTokenCount(action)}`;
}

function formatTokenCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-highlight-high/40 pt-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base text-foreground">{value}</dd>
    </div>
  );
}
