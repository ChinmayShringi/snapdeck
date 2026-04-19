'use client';

import { ExampleDeck } from '../../../components/ExampleDeck';

export default function BasicExamplePage() {
  return (
    <ExampleDeck
      sections={[
        { label: 'One.', kicker: 'basic · 01' },
        { label: 'Two.', kicker: 'basic · 02', tone: 'muted' },
        { label: 'Three.', kicker: 'basic · 03' },
        { label: 'Four.', kicker: 'basic · 04', tone: 'accent' },
      ]}
    />
  );
}
