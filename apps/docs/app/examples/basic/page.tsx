'use client';

import { SnapdeckDemo } from '../../../components/SnapdeckDemo';

export default function BasicExamplePage() {
  return (
    <SnapdeckDemo
      slides={[
        { className: 's1', title: 'Section one', body: 'Scroll or use arrow keys.' },
        { className: 's2', title: 'Section two', body: 'Each child section is one slide.' },
        { className: 's3', title: 'Section three', body: 'Snap is driven by the core engine.' },
        { className: 's4', title: 'Section four', body: 'No plugins loaded here.' },
        { className: 's5', title: 'Section five', body: 'The container fills the viewport.' },
      ]}
    />
  );
}
