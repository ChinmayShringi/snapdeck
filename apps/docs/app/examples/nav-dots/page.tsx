'use client';

import { navDots } from '@snapdeck/plugin-nav-dots';
import { ExampleDeck } from '../../../components/ExampleDeck';

export default function NavDotsExamplePage() {
  return (
    <ExampleDeck
      plugins={[navDots()]}
      sections={[
        { label: 'Dots →', kicker: 'nav-dots · 01' },
        { label: 'Active state.', kicker: 'nav-dots · 02', tone: 'muted' },
        { label: 'Click a dot.', kicker: 'nav-dots · 03' },
        { label: 'Keyboard too.', kicker: 'nav-dots · 04', tone: 'accent' },
      ]}
    />
  );
}
