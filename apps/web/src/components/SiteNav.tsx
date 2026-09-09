'use client';

import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '#top', label: 'Home' },
  { href: '#triage', label: 'Try it' },
  { href: '#about', label: 'About' },
] as const;

/**
 * Fixed transparent nav with hash links and scroll-aware backdrop.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('#top');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);

      const sections = NAV_LINKS.map((link) => {
        const id = link.href.slice(1);
        const el = document.getElementById(id);
        if (!el) {
          return { href: link.href, top: Number.POSITIVE_INFINITY };
        }
        return {
          href: link.href,
          top: Math.abs(el.getBoundingClientRect().top),
        };
      });

      sections.sort((a, b) => a.top - b.top);
      setActive(sections[0]?.href ?? '#top');
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? 'border-b border-highlight-high/40 bg-base-100/70 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-(--nav-height) w-full max-w-6xl items-center justify-between gap-6 px-6 sm:px-10">
        <a
          href="#top"
          className="font-display text-sm font-bold tracking-[0.08em] text-base-content transition-colors hover:text-primary"
        >
          savemytokens
        </a>

        <ul className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.href;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-subtle hover:text-base-content'
                  }`}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
