/**
 * Controlled A/B: with_triage (probe + follow action) vs naive (always crawl HTML).
 *
 * Models a short “build a feature” agent session (docs + packages + references).
 * Measures capped bytes → heuristic tokens — not live LLM usage.
 *
 * Usage:
 *   pnpm ab:triage              # prompts for JSON when interactive
 *   pnpm ab:triage -- --json    # always print JSON
 *   pnpm ab:triage -- --no-json # skip JSON (CI-friendly)
 */
import { bytesToTokens, probeUrl } from '@savemytokens/core';
import type { TriageAction, TriageResult } from '@savemytokens/types';

/** Match probe UA for fair origin behavior. */
const USER_AGENT = 'savemytokens/0.1 (+https://savemytokens.dev)' as const;

/** Fair comparison body cap for content fetches (not the probe snippet). */
const CONTENT_CAP_BYTES = 65_536 as const;

/**
 * Rough list price for pitch copy only (USD per 1M input tokens).
 * Not a billing claim — used to turn token Δ into an intuitive dollar scale.
 */
const ILLUSTRATIVE_USD_PER_MTOK = 3 as const;

/**
 * Simulated agent session: “ship a small OAuth login for a Next.js app”.
 * Each step is a URL the agent would open while researching.
 */
const SESSION = {
  name: 'Ship OAuth login (Next.js)',
  description:
    'Typical docs crawl while adding sign-in: framework docs, auth references, packages, and API notes.',
  fixtures: [
    {
      id: 'next-docs',
      step: 'Read Next.js docs',
      url: 'https://nextjs.org/docs',
    },
    {
      id: 'react-llms',
      step: 'Check React guidance',
      url: 'https://react.dev',
    },
    {
      id: 'hono-docs',
      step: 'Skim Hono API docs',
      url: 'https://hono.dev',
    },
    {
      id: 'mdn-fetch',
      step: 'Confirm Fetch API',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    },
    {
      id: 'wiki-oauth',
      step: 'Refresh OAuth concepts',
      url: 'https://en.wikipedia.org/wiki/OAuth',
    },
    {
      id: 'npm-hono',
      step: 'Inspect npm package page',
      url: 'https://www.npmjs.com/package/hono',
    },
    {
      id: 'npm-zod',
      step: 'Inspect validation package',
      url: 'https://www.npmjs.com/package/zod',
    },
    {
      id: 'example',
      step: 'Hit a tiny static page',
      url: 'https://example.com',
    },
  ],
} as const;

type ArmName = 'with_triage' | 'naive';

interface ArmResult {
  arm: ArmName;
  url: string;
  bytesIngested: number;
  estimatedTokens: number;
  wallMs: number;
  action?: TriageAction;
  probeLatencyMs?: number;
  note?: string;
}

interface UrlComparison {
  id: string;
  step: string;
  url: string;
  withTriage: ArmResult;
  naive: ArmResult;
  tokenDelta: number;
  wallMsDelta: number;
}

async function readCappedBytes(
  url: string,
  maxBytes: number,
): Promise<{ bytes: number; wallMs: number; ok: boolean; note?: string }> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'text/html,text/plain,text/markdown,*/*;q=0.8',
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.body) {
      return {
        bytes: 0,
        wallMs: Date.now() - started,
        ok: false,
        note: `empty body (HTTP ${response.status})`,
      };
    }

    const reader = response.body.getReader();
    let received = 0;
    try {
      while (received < maxBytes) {
        const { done, value } = await reader.read();
        if (done || value === undefined) {
          break;
        }
        const remaining = maxBytes - received;
        received += Math.min(value.byteLength, remaining);
        if (value.byteLength > remaining) {
          break;
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }

    return {
      bytes: received,
      wallMs: Date.now() - started,
      ok: true,
      note: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed';
    return {
      bytes: 0,
      wallMs: Date.now() - started,
      ok: false,
      note: message,
    };
  }
}

async function runNaive(url: string): Promise<ArmResult> {
  const fetchResult = await readCappedBytes(url, CONTENT_CAP_BYTES);
  return {
    arm: 'naive',
    url,
    bytesIngested: fetchResult.bytes,
    estimatedTokens: bytesToTokens(fetchResult.bytes),
    wallMs: fetchResult.wallMs,
    note: fetchResult.note,
  };
}

async function followAction(
  triage: TriageResult,
): Promise<{ bytes: number; wallMs: number; note?: string }> {
  switch (triage.action) {
    case 'USE_LLMS_TXT': {
      const target = triage.llmsTxt.url;
      if (!target) {
        return { bytes: 0, wallMs: 0, note: 'llms.txt url missing' };
      }
      const fetchResult = await readCappedBytes(target, CONTENT_CAP_BYTES);
      return {
        bytes: fetchResult.bytes,
        wallMs: fetchResult.wallMs,
        note: fetchResult.note,
      };
    }
    case 'FETCH_RAW': {
      const fetchResult = await readCappedBytes(triage.url, CONTENT_CAP_BYTES);
      return {
        bytes: fetchResult.bytes,
        wallMs: fetchResult.wallMs,
        note: fetchResult.note,
      };
    }
    case 'HEADLESS_REQUIRED':
      return {
        bytes: 0,
        wallMs: 0,
        note: 'skipped content fetch (headless still required)',
      };
    case 'WAF_BLOCKED':
      return {
        bytes: 0,
        wallMs: 0,
        note: 'aborted content fetch (WAF)',
      };
    case 'ERROR_UNREACHABLE':
      return {
        bytes: 0,
        wallMs: 0,
        note: 'aborted content fetch (unreachable)',
      };
    default: {
      const _exhaustive: never = triage.action;
      return _exhaustive;
    }
  }
}

async function runWithTriage(url: string): Promise<ArmResult> {
  const triageStarted = Date.now();
  const triage = await probeUrl(url);
  const probeWall = Date.now() - triageStarted;
  const probeLatencyMs = triage.latencyMs >= 0 ? triage.latencyMs : probeWall;

  const content = await followAction(triage);
  return {
    arm: 'with_triage',
    url,
    bytesIngested: content.bytes,
    estimatedTokens: bytesToTokens(content.bytes),
    wallMs: probeLatencyMs + content.wallMs,
    action: triage.action,
    probeLatencyMs,
    note: content.note,
  };
}

function pad(
  value: string | number,
  width: number,
  align: 'left' | 'right',
): string {
  const text = String(value);
  if (text.length >= width) {
    return text;
  }
  const fill = ' '.repeat(width - text.length);
  return align === 'right' ? fill + text : text + fill;
}

function formatTokens(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}

function formatMarkdownTable(
  columns: ReadonlyArray<{
    title: string;
    align: 'left' | 'right';
    width: number;
  }>,
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
): string {
  const header =
    '| ' +
    columns.map((c) => pad(c.title, c.width, c.align)).join(' | ') +
    ' |';
  const sep =
    '| ' +
    columns
      .map((c) =>
        c.align === 'right'
          ? pad('-'.repeat(Math.max(3, c.width - 1)) + ':', c.width, 'right')
          : pad('-'.repeat(c.width), c.width, 'left'),
      )
      .join(' | ') +
    ' |';
  const body = rows.map((row) => {
    const cells = columns.map((col, i) =>
      pad(row[i] ?? '', col.width, col.align),
    );
    return `| ${cells.join(' | ')} |`;
  });
  return [header, sep, ...body].join('\n');
}

function formatTable(rows: UrlComparison[]): string {
  return formatMarkdownTable(
    [
      { title: 'session step', align: 'left', width: 26 },
      { title: 'action', align: 'left', width: 18 },
      { title: 'triage tok', align: 'right', width: 10 },
      { title: 'naive tok', align: 'right', width: 10 },
      { title: 'saved tok', align: 'right', width: 10 },
      { title: 'triage ms', align: 'right', width: 9 },
      { title: 'naive ms', align: 'right', width: 8 },
    ],
    rows.map((row) => [
      row.step,
      row.withTriage.action ?? '—',
      row.withTriage.estimatedTokens,
      row.naive.estimatedTokens,
      row.tokenDelta,
      row.withTriage.wallMs,
      row.naive.wallMs,
    ]),
  );
}

function sessionPitch(rows: UrlComparison[]): string {
  const naiveTotal = rows.reduce((s, r) => s + r.naive.estimatedTokens, 0);
  const triageTotal = rows.reduce(
    (s, r) => s + r.withTriage.estimatedTokens,
    0,
  );
  const saved = Math.max(0, naiveTotal - triageTotal);
  const pct = naiveTotal > 0 ? Math.round((saved / naiveTotal) * 100) : 0;
  const usd = (saved / 1_000_000) * ILLUSTRATIVE_USD_PER_MTOK;
  const llmsHits = rows.filter(
    (r) => r.withTriage.action === 'USE_LLMS_TXT',
  ).length;
  const wafAborts = rows.filter(
    (r) => r.withTriage.action === 'WAF_BLOCKED',
  ).length;

  const naiveCost = (
    (naiveTotal / 1_000_000) *
    ILLUSTRATIVE_USD_PER_MTOK
  ).toFixed(4);
  const triageCost = (
    (triageTotal / 1_000_000) *
    ILLUSTRATIVE_USD_PER_MTOK
  ).toFixed(4);

  const summaryTable = formatMarkdownTable(
    [
      { title: 'metric', align: 'left', width: 36 },
      { title: 'naive crawl', align: 'right', width: 12 },
      { title: 'with triage', align: 'right', width: 14 },
    ],
    [
      [
        'estimated tokens ingested',
        formatTokens(naiveTotal),
        formatTokens(triageTotal),
      ],
      ['tokens avoided', '—', `${formatTokens(saved)} (${pct}%)`],
      [
        `illustrative cost @ $${ILLUSTRATIVE_USD_PER_MTOK}/MTok`,
        `$${naiveCost}`,
        `$${triageCost}`,
      ],
    ],
  );

  return [
    '## Why try savemytokens',
    '',
    `Session: **${SESSION.name}** — ${rows.length} URL lookups an agent might make while researching.`,
    '',
    summaryTable,
    '',
    `**Pitch:** On this session, triage avoided ~**${formatTokens(saved)}** tokens (${pct}%) vs always ingesting HTML`,
    llmsHits || wafAborts
      ? ` — including ${llmsHits} llms.txt shortcut(s) and ${wafAborts} WAF abort(s).`
      : '.',
    '',
    `Illustrative savings ≈ **$${usd.toFixed(4)}** of input tokens at $${ILLUSTRATIVE_USD_PER_MTOK}/MTok (heuristic bytes÷4, not measured LLM usage).`,
    'Multiply by every agent session / every teammate — that is the reason to try the API or MCP before the crawl.',
  ].join('\n');
}

async function promptYesNo(
  question: string,
  defaultYes = false,
): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultYes;
  }

  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const hint = defaultYes ? 'Y/n' : 'y/N';
    const answer = (await rl.question(`${question} (${hint}) `))
      .trim()
      .toLowerCase();
    if (answer === '') {
      return defaultYes;
    }
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

function wantsJsonFromArgs(argv: readonly string[]): boolean | null {
  if (argv.includes('--json') || argv.includes('-j')) {
    return true;
  }
  if (argv.includes('--no-json')) {
    return false;
  }
  return null;
}

async function main(): Promise<void> {
  const jsonFlag = wantsJsonFromArgs(process.argv.slice(2));

  console.log(
    `# savemytokens A/B — ${SESSION.name}\n` +
      `${SESSION.description}\n\n` +
      `Content cap: ${CONTENT_CAP_BYTES} bytes · tokens via bytes/4 heuristic\n`,
  );

  const comparisons: UrlComparison[] = [];

  for (const fixture of SESSION.fixtures) {
    process.stderr.write(
      `Probing ${fixture.id} — ${fixture.step}\n  ${fixture.url}\n`,
    );
    const [withTriage, naive] = await Promise.all([
      runWithTriage(fixture.url),
      runNaive(fixture.url),
    ]);

    comparisons.push({
      id: fixture.id,
      step: fixture.step,
      url: fixture.url,
      withTriage,
      naive,
      tokenDelta: naive.estimatedTokens - withTriage.estimatedTokens,
      wallMsDelta: naive.wallMs - withTriage.wallMs,
    });
  }

  console.log('## Per-URL breakdown\n');
  console.log(formatTable(comparisons));
  console.log('');
  console.log(sessionPitch(comparisons));

  const printJson =
    jsonFlag ?? (await promptYesNo('Print JSON summary?', false));

  if (printJson) {
    console.log('\n## JSON\n');
    console.log(
      JSON.stringify(
        {
          session: SESSION.name,
          contentCapBytes: CONTENT_CAP_BYTES,
          illustrativeUsdPerMTok: ILLUSTRATIVE_USD_PER_MTOK,
          comparisons,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
