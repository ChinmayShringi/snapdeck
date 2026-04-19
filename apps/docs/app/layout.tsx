import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@snapdeck/core/css';
import '@snapdeck/plugin-nav-dots/css';
import '@snapdeck/plugin-progress-bar/css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Snapdeck — section-snap scroll',
  description:
    'Section-snap scroll for the modern web. Typed, tiny, tree-shakable. MIT licensed.',
  applicationName: 'Snapdeck',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
