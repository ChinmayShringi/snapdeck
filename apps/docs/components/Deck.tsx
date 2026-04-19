'use client';

import Link from 'next/link';
import { useSnapdeck } from '@snapdeck/react';
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';
import { Logo } from './Logo';

/**
 * Landing deck. This IS the product — rendered live with navDots + progressBar
 * plugins to prove the library works.
 */
export function Deck() {
  const { ref, api } = useSnapdeck({
    scrollingSpeed: 650,
    easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    anchors: ['top', 'motion', 'overhead', 'frameworks', 'plugins', 'end'],
    plugins: [navDots(), progressBar({ position: 'top' })],
  });

  return (
    <div className="demo-host" ref={ref}>
      {/* Section 1 — HERO */}
      <section
        data-snapdeck-section
        data-anchor="top"
        className="demo-section bg-s1"
      >
        <div className="hero-grid" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-[1100px] flex-col items-start gap-10 px-6 md:gap-14">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            <span className="inline-block h-1.5 w-1.5 bg-[var(--color-accent)]" aria-hidden="true" />
            <span>v1 · mit · 0 deps</span>
          </div>

          <h1 className="font-display text-[clamp(4rem,14vw,13rem)] font-bold leading-[0.88] tracking-[-0.04em] text-[var(--color-ink)]">
            Snapdeck<span className="text-[var(--color-accent)]">.</span>
          </h1>

          <p className="max-w-[560px] text-[clamp(1rem,1.6vw,1.25rem)] leading-snug text-[var(--color-ink-dim)]">
            Section-snap scroll for the modern web. Typed, tiny, tree-shakable.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/docs/quickstart/"
              className="group inline-flex items-center gap-2 bg-[var(--color-accent)] px-5 py-3 text-[13px] font-semibold text-[var(--color-accent-ink)] transition-transform hover:-translate-y-[1px] motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              Get started
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
            </Link>
            <a
              href="https://github.com/ChinmayShringi/snapdeck"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 border border-[var(--color-rule-strong)] px-5 py-3 text-[13px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
            >
              GitHub <span aria-hidden="true">↗</span>
            </a>
            <Link
              href="/examples/"
              className="inline-flex items-center gap-2 px-3 py-3 text-[13px] font-semibold text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)]"
            >
              See demos
            </Link>
          </div>

          <div className="pointer-events-none absolute right-6 bottom-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)] md:right-12 md:bottom-12">
            <span>scroll</span>
            <span aria-hidden="true" className="inline-block h-px w-8 bg-[var(--color-rule-strong)]" />
          </div>
        </div>
      </section>

      {/* Section 2 — IN ACTION (horizontal slides) */}
      <section
        data-snapdeck-section
        data-anchor="motion"
        className="demo-section bg-s2 !p-0"
      >
        <div className="flex h-full w-full flex-col">
          <div className="flex items-baseline justify-between border-b border-[var(--color-rule)] px-6 py-4 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              <span>02</span>
              <span>/</span>
              <span>in motion</span>
            </div>
            <div className="hidden items-center gap-3 font-mono text-[11px] text-[var(--color-ink-faint)] md:flex">
              <button
                type="button"
                onClick={() => api?.moveSlideLeft()}
                className="border border-[var(--color-rule-strong)] px-3 py-1.5 text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] motion-reduce:transition-none"
                aria-label="Previous slide"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => api?.moveSlideRight()}
                className="border border-[var(--color-rule-strong)] px-3 py-1.5 text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] motion-reduce:transition-none"
                aria-label="Next slide"
              >
                →
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            {/* Horizontal slides live here */}
            <div data-snapdeck-slide className="absolute inset-0 flex items-end justify-start bg-[#0f0f0f] p-10 md:p-16">
              <div className="flex w-full items-end justify-between gap-8">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">01</div>
                  <div className="mt-2 font-display text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                    Snap.
                  </div>
                </div>
                <div className="hidden text-right font-mono text-[11px] text-[var(--color-ink-dim)] md:block">
                  <div>easing</div>
                  <div className="text-[var(--color-ink)]">cubic-bezier</div>
                </div>
              </div>
            </div>
            <div data-snapdeck-slide className="absolute inset-0 flex items-end justify-start bg-[#111111] p-10 md:p-16">
              <div className="flex w-full items-end justify-between gap-8">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">02</div>
                  <div className="mt-2 font-display text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                    Slide.
                  </div>
                </div>
                <div className="hidden text-right font-mono text-[11px] text-[var(--color-ink-dim)] md:block">
                  <div>direction</div>
                  <div className="text-[var(--color-ink)]">horizontal</div>
                </div>
              </div>
            </div>
            <div data-snapdeck-slide className="absolute inset-0 flex items-end justify-start bg-[#0d0d0d] p-10 md:p-16">
              <div className="flex w-full items-end justify-between gap-8">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)]">03</div>
                  <div className="mt-2 font-display text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                    Ship.
                  </div>
                </div>
                <div className="hidden text-right font-mono text-[11px] text-[var(--color-ink-dim)] md:block">
                  <div>api</div>
                  <div className="text-[var(--color-ink)]">moveSlideRight()</div>
                </div>
              </div>
            </div>
            <div data-snapdeck-slide className="absolute inset-0 flex flex-col justify-between bg-[var(--color-accent)] p-10 text-[var(--color-accent-ink)] md:p-16">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em]">04 · demo</div>
              <div className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                Try it.
              </div>
              <div className="font-mono text-[11px]">
                use ← / → keys, or buttons above
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — ZERO OVERHEAD stats */}
      <section
        data-snapdeck-section
        data-anchor="overhead"
        className="demo-section bg-s3"
      >
        <div className="mx-auto w-full max-w-[1100px] px-6">
          <div className="mb-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            <span>03</span>
            <span>/</span>
            <span>overhead</span>
          </div>
          <div className="grid grid-cols-1 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)] md:grid-cols-3 md:divide-x md:divide-y-0">
            <Stat kpi="0" label="runtime deps" suffix="packages" />
            <Stat kpi="~8kb" label="gzipped core" suffix="min+gz" />
            <Stat kpi="400+" label="tests" suffix="passing" />
          </div>
          <p className="mt-10 max-w-[480px] text-[15px] leading-snug text-[var(--color-ink-dim)]">
            Built on the web platform. Element.animate. IntersectionObserver. ResizeObserver.
          </p>
        </div>
      </section>

      {/* Section 4 — FRAMEWORKS */}
      <section
        data-snapdeck-section
        data-anchor="frameworks"
        className="demo-section bg-s4"
      >
        <div className="mx-auto w-full max-w-[1100px] px-6">
          <div className="mb-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            <span>04</span>
            <span>/</span>
            <span>framework-agnostic</span>
          </div>
          <h2 className="mb-12 max-w-[680px] font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[0.95] tracking-[-0.025em]">
            One core. Four wrappers.
          </h2>
          <div className="grid grid-cols-2 gap-px bg-[var(--color-rule)] md:grid-cols-4">
            <FrameworkTile name="Vanilla" code="@snapdeck/core" href="/docs/quickstart/#vanilla" />
            <FrameworkTile name="React" code="@snapdeck/react" href="/docs/quickstart/#react" />
            <FrameworkTile name="Vue" code="@snapdeck/vue" href="/docs/quickstart/#vue" />
            <FrameworkTile name="Angular" code="@snapdeck/angular" href="/docs/quickstart/#angular" />
          </div>
        </div>
      </section>

      {/* Section 5 — PLUGINS */}
      <section
        data-snapdeck-section
        data-anchor="plugins"
        className="demo-section bg-s5"
      >
        <div className="mx-auto w-full max-w-[1100px] px-6">
          <div className="mb-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            <span>05</span>
            <span>/</span>
            <span>plugins</span>
          </div>
          <h2 className="mb-12 max-w-[680px] font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[0.95] tracking-[-0.025em]">
            Opt-in. Tree-shakable.
          </h2>
          <div className="grid grid-cols-1 gap-px bg-[var(--color-rule)] md:grid-cols-2 lg:grid-cols-4">
            <PluginTile
              name="nav-dots"
              hint="see right edge →"
              visual={
                <div className="flex flex-col items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                  <span className="h-2.5 w-2.5 rounded-full border border-[var(--color-rule-strong)]" />
                  <span className="h-2.5 w-2.5 rounded-full border border-[var(--color-rule-strong)]" />
                </div>
              }
            />
            <PluginTile
              name="progress-bar"
              hint="see top edge ↑"
              visual={
                <div className="flex h-1 w-full max-w-[140px] overflow-hidden bg-[var(--color-rule)]">
                  <div className="h-full w-[62%] bg-[var(--color-accent)]" />
                </div>
              }
            />
            <PluginTile
              name="lazy-media"
              hint="viewport-aware"
              visual={
                <div className="grid grid-cols-3 gap-1">
                  <div className="h-6 w-6 bg-[var(--color-rule)]" />
                  <div className="h-6 w-6 bg-[var(--color-rule-strong)]" />
                  <div className="h-6 w-6 bg-[var(--color-accent)]" />
                </div>
              }
            />
            <PluginTile
              name="observer"
              hint="reactive state"
              visual={
                <div className="font-mono text-[10px] text-[var(--color-ink-dim)]">
                  <div>→ afterLoad</div>
                  <div>→ beforeLeave</div>
                  <div className="text-[var(--color-accent)]">● active</div>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* Section 6 — FOOTER */}
      <section
        data-snapdeck-section
        data-anchor="end"
        className="demo-section bg-s6 !items-stretch !justify-stretch !p-0"
      >
        <div className="flex h-full w-full flex-col">
          <div className="flex flex-1 flex-col items-start justify-center px-6 md:px-16">
            <div className="mx-auto w-full max-w-[1100px]">
              <div className="mb-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                <span>06</span>
                <span>/</span>
                <span>end</span>
              </div>
              <h2 className="max-w-[900px] font-display text-[clamp(2.5rem,7vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                Build it.<br />
                <span className="text-[var(--color-ink-faint)]">Ship it.</span>
              </h2>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/docs/quickstart/"
                  className="bg-[var(--color-accent)] px-5 py-3 text-[13px] font-semibold text-[var(--color-accent-ink)]"
                >
                  Quickstart →
                </Link>
                <a
                  href="https://github.com/ChinmayShringi/snapdeck"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="border border-[var(--color-rule-strong)] px-5 py-3 text-[13px] font-semibold transition-colors hover:border-[var(--color-ink)]"
                >
                  Star on GitHub ↗
                </a>
              </div>
            </div>
          </div>
          <footer className="border-t border-[var(--color-rule)] px-6 py-6 md:px-16">
            <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 font-mono text-[11px] text-[var(--color-ink-faint)] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Logo size={14} className="text-[var(--color-accent)]" />
                <span>snapdeck</span>
                <span>mit</span>
                <span>2026</span>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/docs/" className="transition-colors hover:text-[var(--color-ink)]">docs</Link>
                <Link href="/examples/" className="transition-colors hover:text-[var(--color-ink)]">examples</Link>
                <a
                  href="https://github.com/ChinmayShringi/snapdeck"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-[var(--color-ink)]"
                >
                  github ↗
                </a>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

function Stat({ kpi, label, suffix }: { readonly kpi: string; readonly label: string; readonly suffix: string }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-10 md:px-10 md:py-12">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="font-display text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em] text-[var(--color-ink)]">
        {kpi}
      </div>
      <div className="font-mono text-[11px] text-[var(--color-ink-dim)]">
        {suffix}
      </div>
    </div>
  );
}

function FrameworkTile({ name, code, href }: { readonly name: string; readonly code: string; readonly href: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 bg-[var(--color-canvas)] p-6 transition-colors hover:bg-[var(--color-canvas-raised)] md:p-8 motion-reduce:transition-none"
    >
      <div className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
        {name}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <code className="font-mono text-[11px] text-[var(--color-ink-dim)]">{code}</code>
        <span
          aria-hidden="true"
          className="font-mono text-[11px] text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-accent)] motion-reduce:transition-none"
        >
          →
        </span>
      </div>
    </Link>
  );
}

function PluginTile({
  name,
  hint,
  visual,
}: {
  readonly name: string;
  readonly hint: string;
  readonly visual: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col gap-6 bg-[var(--color-canvas)] p-6 transition-colors hover:bg-[var(--color-canvas-raised)] md:p-8 motion-reduce:transition-none">
      <div className="flex h-14 items-center">{visual}</div>
      <div className="mt-auto">
        <div className="font-mono text-[13px] font-semibold text-[var(--color-ink)]">
          {name}
        </div>
        <div className="mt-1 font-mono text-[11px] text-[var(--color-ink-faint)]">
          {hint}
        </div>
      </div>
    </div>
  );
}
