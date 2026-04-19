import { CodeBlock } from '../../../components/CodeBlock';

export const metadata = {
  title: 'Options — Snapdeck',
};

const DEFAULTS = `{
  scrollingSpeed: 700,
  easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  keyboardScrolling: true,
  loopTop: false,
  loopBottom: false,
  autoScrolling: true,
  fitToSection: true,
  anchors: [],
  slideSelector: '[data-snapdeck-slide]',
  sectionSelector: '[data-snapdeck-section]',
  plugins: [],
}`;

interface Row {
  readonly key: string;
  readonly type: string;
  readonly def: string;
  readonly note: string;
}

const ROWS: ReadonlyArray<Row> = [
  { key: 'scrollingSpeed', type: 'number', def: '700', note: 'ms per transition' },
  { key: 'easing', type: 'string', def: 'cubic-bezier(0.2,0.7,0.2,1)', note: 'CSS easing function' },
  { key: 'keyboardScrolling', type: 'boolean', def: 'true', note: 'arrow / page / home / end keys' },
  { key: 'loopTop', type: 'boolean', def: 'false', note: 'wrap from first to last' },
  { key: 'loopBottom', type: 'boolean', def: 'false', note: 'wrap from last to first' },
  { key: 'autoScrolling', type: 'boolean', def: 'true', note: 'engage section snap' },
  { key: 'fitToSection', type: 'boolean', def: 'true', note: 'snap to nearest on resize' },
  { key: 'anchors', type: 'string[]', def: '[]', note: 'per-section URL hashes' },
  { key: 'plugins', type: 'Plugin[]', def: '[]', note: 'registered plugins' },
];

export default function OptionsPage() {
  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Docs / options
      </div>
      <h1>Options.</h1>
      <p>Every option has a default. Configure only what you need.</p>

      <h2>Defaults</h2>
      <CodeBlock code={DEFAULTS} lang="ts" label="defaults" />

      <h2>Reference</h2>
      <table>
        <thead>
          <tr>
            <th>key</th>
            <th>type</th>
            <th>default</th>
            <th>note</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key}>
              <td><code>{r.key}</code></td>
              <td>{r.type}</td>
              <td>{r.def}</td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
