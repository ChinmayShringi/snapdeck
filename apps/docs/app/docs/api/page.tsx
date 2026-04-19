import { CodeBlock } from '../../../components/CodeBlock';

export const metadata = {
  title: 'API — Snapdeck',
};

const FACTORY = `import snapdeck from '@snapdeck/core';
import type { SnapdeckOptions, SnapdeckInstance } from '@snapdeck/core';

const api: SnapdeckInstance = snapdeck(
  target: HTMLElement | string,
  options?: Partial<SnapdeckOptions>,
);`;

const METHODS = `api.moveTo(target: AnchorOrIndex): Promise<void>
api.moveSectionUp(): Promise<void>
api.moveSectionDown(): Promise<void>
api.moveSlideLeft(): Promise<void>
api.moveSlideRight(): Promise<void>
api.setOption<K>(key: K, value: SnapdeckOptions[K]): void
api.on(event, handler): Unsubscribe
api.off(event, handler): void
api.destroy(): void`;

const STATE = `api.state: {
  readonly activeIndex: number;
  readonly activeAnchor: string | null;
  readonly isMoving: boolean;
  readonly sections: ReadonlyArray<Section>;
  readonly viewport: { width: number; height: number };
};`;

export default function ApiPage() {
  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Docs / api
      </div>
      <h1>API.</h1>
      <p>The surface is intentionally small. One factory, one instance.</p>

      <h2>Factory</h2>
      <CodeBlock code={FACTORY} lang="ts" />

      <h2>Methods</h2>
      <CodeBlock code={METHODS} lang="ts" />

      <h2>State</h2>
      <CodeBlock code={STATE} lang="ts" />

      <h2>Types</h2>
      <p>
        All public types are exported from <code>@snapdeck/core</code> and
        re-exported from framework wrappers.
      </p>
    </>
  );
}
