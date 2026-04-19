'use client';

import { ExampleDeck } from '../../../components/ExampleDeck';

export default function WithAnchorsExamplePage() {
  return (
    <ExampleDeck
      options={{ anchors: ['intro', 'why', 'how', 'end'] }}
      sections={[
        { label: '#intro', kicker: 'anchors · 01' },
        { label: '#why', kicker: 'anchors · 02', tone: 'muted' },
        { label: '#how', kicker: 'anchors · 03' },
        { label: '#end', kicker: 'anchors · 04', tone: 'accent' },
      ]}
    />
  );
}
