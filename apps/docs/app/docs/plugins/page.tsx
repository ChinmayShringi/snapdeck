import Link from 'next/link';
import { CodeBlock } from '../../../components/CodeBlock';

export const metadata = {
  title: 'Plugins — Snapdeck',
};

const USAGE = `import snapdeck from '@snapdeck/core';
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';
import '@snapdeck/plugin-nav-dots/css';
import '@snapdeck/plugin-progress-bar/css';

snapdeck('#deck', {
  plugins: [
    navDots(),
    progressBar({ position: 'top' }),
  ],
});`;

interface PluginRow {
  readonly name: string;
  readonly pkg: string;
  readonly demo: string;
}

const PLUGINS: ReadonlyArray<PluginRow> = [
  { name: 'nav-dots', pkg: '@snapdeck/plugin-nav-dots', demo: '/examples/nav-dots/' },
  { name: 'progress-bar', pkg: '@snapdeck/plugin-progress-bar', demo: '/examples/progress-bar/' },
  { name: 'lazy-media', pkg: '@snapdeck/plugin-lazy-media', demo: '/examples/basic/' },
  { name: 'observer', pkg: '@snapdeck/plugin-observer', demo: '/examples/basic/' },
];

export default function PluginsPage() {
  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Docs / plugins
      </div>
      <h1>Plugins.</h1>
      <p>Opt-in capabilities. Each is a separate package. Import only what you need.</p>

      <h2>Usage</h2>
      <CodeBlock code={USAGE} lang="ts" />

      <h2>Built-in</h2>
      <table>
        <thead>
          <tr>
            <th>name</th>
            <th>package</th>
            <th>demo</th>
          </tr>
        </thead>
        <tbody>
          {PLUGINS.map((p) => (
            <tr key={p.name}>
              <td><code>{p.name}</code></td>
              <td><code>{p.pkg}</code></td>
              <td><Link href={p.demo}>see →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Authoring</h2>
      <p>
        A plugin is a factory returning <code>{'{ name, setup(instance) }'}</code>. Register via the{' '}
        <code>plugins</code> option.
      </p>
    </>
  );
}
