'use client';

import { useState, type ReactNode } from 'react';

export interface Tab {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

export function Tabs({ tabs, initial }: { readonly tabs: ReadonlyArray<Tab>; readonly initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id ?? '');
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="my-6">
      <div role="tablist" className="flex gap-0 border-b border-[var(--color-rule)]">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActive(t.id)}
              className={
                'px-4 py-2.5 font-mono text-[12px] transition-colors motion-reduce:transition-none ' +
                (isActive
                  ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border-b-2 border-transparent text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]')
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-2">
        {current?.content}
      </div>
    </div>
  );
}
