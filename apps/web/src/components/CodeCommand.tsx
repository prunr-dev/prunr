'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CodeCommandProps = {
  /** Shell command to display and copy. Do not include a leading `$`. */
  code: string;
  className?: string;
  /** Shown as a soft prompt before the command (Geist Snippet default). */
  prompt?: boolean;
  width?: string | number;
};

export function CodeCommand({
  code,
  className,
  prompt = true,
  width = '100%',
}: CodeCommandProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        'group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-2xl border border-highlight-high/40 bg-card/70 px-4 py-3 font-display text-sm text-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--highlight-high)_20%,transparent)] backdrop-blur-sm',
        className,
      )}
      style={{ width }}
    >
      <pre className="m-0 min-w-0 flex-1 overflow-x-auto leading-relaxed">
        <code className="whitespace-pre font-mono text-foreground/95">
          {prompt ? (
            <span
              className="mr-2 select-none text-lg font-mono text-muted-foreground"
              aria-hidden
            >
              $
            </span>
          ) : null}
          <span className="text-lg text-foreground/85 font-mono">{code}</span>
        </code>
      </pre>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 hover:cursor-pointer rounded-full text-muted-foreground hover:text-foreground"
        aria-label={copied ? 'Copied' : 'Copy command'}
        onClick={() => void onCopy()}
      >
        {copied ? (
          <CheckIcon className="text-accent" aria-hidden />
        ) : (
          <CopyIcon aria-hidden />
        )}
      </Button>
    </div>
  );
}
