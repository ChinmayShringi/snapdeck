'use client';

import { navDots } from '@snapdeck/plugin-nav-dots';
import { SnapdeckDemo } from '../../../components/SnapdeckDemo';

export default function NavDotsExamplePage() {
  return (
    <SnapdeckDemo
      plugins={[navDots()]}
      slides={[
        { className: 's1', title: 'Dots on the right', body: 'Click a dot to jump.' },
        { className: 's2', title: 'Active state', body: 'The current dot reflects the active section.' },
        { className: 's3', title: 'Keyboard', body: 'Arrow keys also work.' },
        { className: 's4', title: 'Styling', body: 'Ship your own CSS or use the defaults.' },
      ]}
    />
  );
}
