export const metadata = {
  title: 'Getting started — Snapdeck',
  description: 'Install Snapdeck and create your first section-snap deck.',
};

export default function GettingStartedPage() {
  return (
    <main className="container">
      <h1>Getting started</h1>
      <p className="muted">
        Install the core package and mount a deck on any container with full-viewport sections.
      </p>

      <h2>Install</h2>
      <pre>
        <code>{`pnpm add @snapdeck/core
# optional framework wrappers
pnpm add @snapdeck/react
pnpm add @snapdeck/vue
# optional plugins
pnpm add @snapdeck/plugin-nav-dots
pnpm add @snapdeck/plugin-progress-bar
pnpm add @snapdeck/plugin-lazy-media`}</code>
      </pre>

      <h2>Vanilla usage</h2>
      <pre>
        <code>{`import snapdeck from '@snapdeck/core';
import '@snapdeck/core/css';

const deck = snapdeck('#deck', {
  scrollingSpeed: 700,
  anchors: ['intro', 'features', 'pricing'],
});

deck.on('afterLoad', ({ destination }) => {
  console.log('on section', destination.anchor);
});

await deck.moveTo('pricing');`}</code>
      </pre>

      <h2>React</h2>
      <pre>
        <code>{`import { useSnapdeck } from '@snapdeck/react';
import '@snapdeck/core/css';

export function Deck() {
  const { ref } = useSnapdeck({ anchors: ['intro', 'features', 'pricing'] });
  return (
    <div ref={ref} style={{ height: '100vh' }}>
      <section>Intro</section>
      <section>Features</section>
      <section>Pricing</section>
    </div>
  );
}`}</code>
      </pre>

      <h2>Markup requirements</h2>
      <p>
        The container should occupy the viewport height. Each direct child <code>section</code>{' '}
        becomes one slide.
      </p>
    </main>
  );
}
