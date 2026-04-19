import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@snapdeck/core/css';
import './globals.css';
import { DocsNav } from '../components/DocsNav';

export const metadata: Metadata = {
  title: 'Snapdeck — section-snap scroll library',
  description:
    'Snapdeck is a modern, framework-agnostic section-snap scroll library. Tiny core, typed API, tree-shakable plugins. MIT licensed.',
  applicationName: 'Snapdeck',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <DocsNav />
        {children}
        <footer className="footer">
          Snapdeck is MIT licensed. Built as an independent, clean-room implementation.
        </footer>
      </body>
    </html>
  );
}
