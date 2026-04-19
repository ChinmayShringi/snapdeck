'use client';

import Link from 'next/link';
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';
import { SnapdeckDemo } from '../components/SnapdeckDemo';

export default function HomePage() {
  return (
    <SnapdeckDemo
      plugins={[navDots(), progressBar({ position: 'top' })]}
      slides={[
        {
          className: 's1',
          title: 'Snapdeck',
          body: 'Modern, framework-agnostic section-snap scroll. Tiny core, typed API, tree-shakable plugins. MIT licensed.',
        },
        {
          className: 's2',
          title: 'Zero runtime deps',
          body: 'ES2022. Evergreen browsers. Built on the web platform: Element.animate, IntersectionObserver, ResizeObserver, Pointer Events.',
        },
        {
          className: 's3',
          title: 'React first-class',
          body: 'Use the useSnapdeck hook and SnapdeckProvider. Subscribe to events with useSnapdeckEvent.',
        },
        {
          className: 's4',
          title: 'Plugins',
          body: 'Nav dots, progress bar, lazy media. Everything opt-in, everything tree-shakable.',
        },
        {
          className: 's5',
          title: 'Get started',
          body: 'Install @snapdeck/core, pick a framework wrapper, and ship.',
        },
      ]}
      footer={
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link className="btn" href="/docs/getting-started/">
            Read docs
          </Link>
          <Link className="btn ghost" href="/examples/">
            See examples
          </Link>
        </div>
      }
    />
  );
}
