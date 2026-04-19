'use client';

import { useSnapdeck } from '@snapdeck/react';
import type { Plugin, SnapdeckOptions } from '@snapdeck/core';
import type { ReactNode } from 'react';

export interface ExampleSection {
  readonly label: string;
  readonly kicker?: string;
  readonly tone?: 'ink' | 'accent' | 'muted';
  readonly slides?: ReadonlyArray<{ readonly label: string; readonly tone?: 'ink' | 'accent' | 'muted' }>;
  readonly body?: ReactNode;
}

export interface ExampleDeckProps {
  readonly sections: ReadonlyArray<ExampleSection>;
  readonly plugins?: ReadonlyArray<Plugin>;
  readonly options?: Partial<SnapdeckOptions>;
}

function toneClasses(tone?: 'ink' | 'accent' | 'muted'): string {
  if (tone === 'accent') return 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]';
  if (tone === 'muted') return 'bg-[#121212] text-[var(--color-ink)]';
  return 'bg-[#0a0a0a] text-[var(--color-ink)]';
}

export function ExampleDeck({ sections, plugins, options }: ExampleDeckProps) {
  const { ref } = useSnapdeck({
    scrollingSpeed: 650,
    ...(options ?? {}),
    ...(plugins && plugins.length > 0 ? { plugins } : {}),
  });

  return (
    <div className="demo-host" ref={ref}>
      {sections.map((s, i) => (
        <section
          key={i}
          data-snapdeck-section
          className={`demo-section ${toneClasses(s.tone)} !p-0`}
        >
          {s.slides && s.slides.length > 0 ? (
            <div className="relative h-full w-full">
              {s.slides.map((sl, j) => (
                <div
                  key={j}
                  data-snapdeck-slide
                  className={`absolute inset-0 flex flex-col justify-between p-10 md:p-16 ${toneClasses(sl.tone)}`}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">
                    slide {j + 1} / {s.slides!.length}
                  </div>
                  <div className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                    {sl.label}
                  </div>
                  <div className="font-mono text-[11px] opacity-70">
                    ← / → or scroll
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col justify-center px-6 md:px-10">
              {s.kicker ? (
                <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">
                  {s.kicker}
                </div>
              ) : null}
              <div className="font-display text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-[-0.03em]">
                {s.label}
              </div>
              {s.body ? <div className="mt-6 max-w-[520px] text-[15px] opacity-80">{s.body}</div> : null}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
