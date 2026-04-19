import Link from 'next/link';
import { TopBar } from '../../components/TopBar';

export const metadata = {
  title: 'Examples — Snapdeck',
};

interface ExampleCard {
  readonly href: string;
  readonly title: string;
  readonly kicker: string;
  readonly tag: string;
}

const EXAMPLES: ReadonlyArray<ExampleCard> = [
  { href: '/examples/basic/', title: 'Basic', kicker: '01', tag: 'core only' },
  { href: '/examples/nav-dots/', title: 'Nav dots', kicker: '02', tag: '+ plugin-nav-dots' },
  { href: '/examples/progress-bar/', title: 'Progress bar', kicker: '03', tag: '+ plugin-progress-bar' },
  { href: '/examples/horizontal-slides/', title: 'Horizontal slides', kicker: '04', tag: 'moveSlideRight()' },
  { href: '/examples/with-anchors/', title: 'Anchors', kicker: '05', tag: 'URL hash sync' },
];

export default function ExamplesIndex() {
  return (
    <>
      <TopBar />
      <main
        className="mx-auto max-w-[1200px] px-6 pb-24 md:px-12"
        style={{ paddingTop: 'calc(var(--nav-h) + 64px)' }}
      >
        <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          Examples
        </div>
        <h1 className="mb-3 font-display text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.95] tracking-[-0.03em]">
          Decks.
        </h1>
        <p className="mb-12 max-w-[520px] text-[var(--color-ink-dim)]">
          One focused deck per capability. Each is live.
        </p>

        <div className="grid grid-cols-1 gap-px bg-[var(--color-rule)] md:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex.href}
              href={ex.href}
              className="group flex flex-col gap-4 bg-[var(--color-canvas)] p-8 transition-colors hover:bg-[var(--color-canvas-raised)] motion-reduce:transition-none"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                {ex.kicker}
              </div>
              <div className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
                {ex.title}
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="font-mono text-[11px] text-[var(--color-ink-dim)]">{ex.tag}</span>
                <span
                  aria-hidden="true"
                  className="text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-accent)] motion-reduce:transition-none"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
