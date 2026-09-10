'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon, TerminalIcon } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

type CodeCommandProps = {
  code: string;
  label?: string;
  className?: string;
};

/**
 * Copyable shell/command block built on shadcn Input Group.
 */
export function CodeCommand({
  code,
  label = 'bash',
  className,
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
    <InputGroup
      className={cn(
        'h-auto overflow-hidden rounded-2xl border-highlight-high/40 bg-card/60 dark:bg-card/60',
        className,
      )}
    >
      <InputGroupAddon align="block-start" className="border-b border-highlight-high/30">
        <InputGroupText className="font-display tracking-wide">
          <TerminalIcon aria-hidden />
          {label}
        </InputGroupText>
        <InputGroupButton
          size="icon-xs"
          variant="ghost"
          className="ml-auto rounded-full"
          aria-label={copied ? 'Copied' : 'Copy command'}
          onClick={() => void onCopy()}
        >
          {copied ? (
            <CheckIcon className="text-accent" aria-hidden />
          ) : (
            <CopyIcon aria-hidden />
          )}
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        readOnly
        value={code}
        aria-label={`${label} command`}
        onFocus={(event) => event.currentTarget.select()}
        className="h-auto min-h-12 px-4 py-3.5 font-display text-sm leading-relaxed text-foreground md:text-sm"
      />
    </InputGroup>
  );
}
