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
import { Separator } from '@/components/ui/separator';
import { fetchTriage, getApiBaseUrl } from '@/lib/api';
import { DEMO_PRESETS } from '@/lib/presets';
import { cn } from '@/lib/utils';

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
    color: 'var(--destructive)',
  },
  action: {
    label: 'Action path',
    color: 'var(--accent)',
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
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div
        className="animate-rise flex flex-wrap gap-2.5"
        style={{ animationDelay: '40ms' }}
      >
        {DEMO_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            className="border-highlight-high/60 font-display text-sm tracking-wide text-muted-foreground"
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
            className="font-display text-xs tracking-[0.16em] text-muted-foreground uppercase"
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
              className="min-w-0 flex-1 font-display text-base sm:h-12"
            />
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="animate-pulse-primary min-w-32 font-display text-lg font-bold tracking-wide sm:self-stretch"
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
          <AlertDescription className="font-display text-base">
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

  const savings = result.tokenEstimate.savingsPercent;
  const savingsTone =
    savings > 0
      ? 'text-accent'
      : savings < 0
        ? 'text-destructive'
        : 'text-foreground';

  return (
    <Card
      className="animate-rise border-0 bg-linear-to-b from-card/95 to-highlight-low/50 shadow-[0_0_0_1px_color-mix(in_srgb,var(--highlight-high)_50%,transparent),0_28px_70px_-28px_rgba(0,0,0,0.65)] backdrop-blur-sm"
      style={{ animationDelay: '100ms' }}
      aria-live="polite"
    >
      <CardHeader className="gap-3">
        <CardDescription className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Recommended action
        </CardDescription>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
            {ACTION_LABELS[result.action]}
          </CardTitle>
          <Badge
            variant={ACTION_BADGE[result.action]}
            className="font-display tracking-wide"
          >
            {result.action}
          </Badge>
        </div>
        <p className="max-w-prose text-base leading-relaxed text-foreground/80">
          {result.reason}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Est. token savings"
            value={`${savings}%`}
            valueClassName={cn(
              'font-display text-5xl font-bold tracking-tight sm:text-6xl',
              savingsTone,
            )}
          />
          <Metric
            label="Baseline → action"
            value={formatTokenPath(
              result.tokenEstimate.baselineTokens,
              result.tokenEstimate.actionTokens,
            )}
            valueClassName="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          />
          <Metric
            label="Probe latency"
            value={`${result.latencyMs}`}
            suffix="ms"
            valueClassName="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          />
        </div>

        <Separator className="bg-highlight-high/35" />

        <div>
          <p className="font-display text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Token path
          </p>
          <ChartContainer
            config={tokenChartConfig}
            className="mt-4 aspect-[2.6/1] w-full"
            initialDimension={{ width: 520, height: 180 }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
              barCategoryGap="12%"
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                axisLine={false}
                width={78}
                tick={{
                  fill: 'var(--muted-foreground)',
                  fontSize: 13,
                  fontFamily: 'var(--font-outfit)',
                }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="tokens" radius={999} barSize={16}>
                {chartData.map((entry) => (
                  <Cell key={entry.stage} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        <Separator className="bg-highlight-high/35" />

        <dl className="grid gap-5 sm:grid-cols-2">
          <Detail
            label="llms.txt"
            value={
              result.llmsTxt.found
                ? (result.llmsTxt.path ?? 'found')
                : 'not found'
            }
          />
          <Detail
            label="Shields"
            value={
              result.shields.detected
                ? (result.shields.vendor ?? 'detected')
                : 'none'
            }
          />
        </dl>

        {result.llmsTxt.found && result.llmsTxt.url ? (
          <p className="font-display text-sm break-all">
            <a
              href={result.llmsTxt.url}
              target="_blank"
              rel="noreferrer"
              className="text-secondary underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {result.llmsTxt.url}
            </a>
          </p>
        ) : null}

        {result.shields.detected && result.shields.evidence.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.shields.evidence.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="font-display text-sm"
              >
                {item}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="border-t border-highlight-high/30 pt-5">
          <p className="truncate font-display text-sm text-muted-foreground">
            {result.url}
          </p>
          <p className="mt-1.5 font-display text-xs tracking-wide text-muted-foreground/80">
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

function Metric({
  label,
  value,
  suffix,
  valueClassName,
}: {
  label: string;
  value: string;
  suffix?: string;
  valueClassName: string;
}) {
  return (
    <div className="rounded-2xl bg-background/25 px-4 py-5 ring-1 ring-highlight-high/25 sm:px-5">
      <p className="font-display text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn('mt-3 leading-none', valueClassName)}>
        {value}
        {suffix ? (
          <span className="ml-1.5 align-baseline text-lg font-medium tracking-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-2 font-display text-xl font-medium tracking-tight text-foreground">
        {value}
      </dd>
    </div>
  );
}
