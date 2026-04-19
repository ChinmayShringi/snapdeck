'use client';

import { ExampleDeck } from '../../../components/ExampleDeck';

export default function HorizontalSlidesExamplePage() {
  return (
    <ExampleDeck
      sections={[
        { label: 'Vertical.', kicker: 'slides · 01' },
        {
          label: 'Horizontal',
          kicker: 'slides · 02',
          slides: [
            { label: 'A' },
            { label: 'B', tone: 'muted' },
            { label: 'C', tone: 'accent' },
            { label: 'D' },
          ],
        },
        { label: 'Back to vertical.', kicker: 'slides · 03', tone: 'muted' },
      ]}
    />
  );
}
