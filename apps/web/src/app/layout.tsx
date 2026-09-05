import type { Metadata } from 'next';
import { IBM_Plex_Mono, Syne } from 'next/font/google';

import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prunr — pre-flight triage',
  description:
    'Diagnostic visualizer for Prunr: inspect how AI agents should fetch a URL before they crawl.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${plexMono.variable}`}>
      <body className="font-display antialiased">{children}</body>
    </html>
  );
}
