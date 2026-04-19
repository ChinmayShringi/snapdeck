import Link from 'next/link';

export const metadata = {
  title: 'Plugins — Snapdeck',
  description: 'Built-in Snapdeck plugins: nav dots, progress bar, lazy media.',
};

export default function PluginsPage() {
  return (
    <main className="container">
      <h1>Plugins</h1>
      <p className="muted">
        Plugins are tree-shakable factory functions that return a <code>Plugin</code> value. Pass
        them to <code>snapdeck()</code> via the <code>plugins</code> option.
      </p>

      <h2>@snapdeck/plugin-nav-dots</h2>
      <pre>
        <code>{`import { navDots } from '@snapdeck/plugin-nav-dots';
import '@snapdeck/plugin-nav-dots/css';

snapdeck('#deck', { plugins: [navDots()] });`}</code>
      </pre>
      <p>
        Renders a vertical dot strip on the side of the viewport. Clicking a dot navigates to the
        matching section. See the{' '}
        <Link href="/examples/with-nav-dots/">nav dots example</Link>.
      </p>

      <h2>@snapdeck/plugin-progress-bar</h2>
      <pre>
        <code>{`import { progressBar } from '@snapdeck/plugin-progress-bar';
import '@snapdeck/plugin-progress-bar/css';

snapdeck('#deck', { plugins: [progressBar({ position: 'top' })] });`}</code>
      </pre>
      <p>
        Shows a thin bar at the top or bottom tracking the current section index. See the{' '}
        <Link href="/examples/with-progress-bar/">progress bar example</Link>.
      </p>

      <h2>@snapdeck/plugin-lazy-media</h2>
      <pre>
        <code>{`import { lazyMedia } from '@snapdeck/plugin-lazy-media';

snapdeck('#deck', { plugins: [lazyMedia()] });`}</code>
      </pre>
      <p>
        Rewrites <code>data-src</code> to <code>src</code> on images and videos as sections approach
        the viewport, keeping first paint lean.
      </p>
    </main>
  );
}
