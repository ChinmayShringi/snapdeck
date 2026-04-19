'use client';

import { progressBar } from '@snapdeck/plugin-progress-bar';
import { SnapdeckDemo } from '../../../components/SnapdeckDemo';

export default function ProgressBarExamplePage() {
  return (
    <SnapdeckDemo
      plugins={[progressBar({ position: 'top' })]}
      slides={[
        { className: 's1', title: 'Progress at the top', body: 'Watch the bar fill as you move.' },
        { className: 's2', title: 'Driven by section index', body: 'The bar maps progress to sections, not pixels.' },
        { className: 's3', title: 'Bottom variant', body: 'Set position: "bottom" to flip it.' },
        { className: 's4', title: 'That is all', body: 'Combine with other plugins as needed.' },
      ]}
    />
  );
}
