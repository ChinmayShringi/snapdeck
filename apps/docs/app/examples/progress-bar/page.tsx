'use client';

import { progressBar } from '@snapdeck/plugin-progress-bar';
import { ExampleDeck } from '../../../components/ExampleDeck';

export default function ProgressBarExamplePage() {
  return (
    <ExampleDeck
      plugins={[progressBar({ position: 'top' })]}
      sections={[
        { label: 'Scroll.', kicker: 'progress · 01' },
        { label: 'Watch ↑', kicker: 'progress · 02', tone: 'muted' },
        { label: 'Smooth.', kicker: 'progress · 03' },
        { label: 'Done.', kicker: 'progress · 04', tone: 'accent' },
      ]}
    />
  );
}
