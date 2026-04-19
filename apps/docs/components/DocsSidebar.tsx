import Link from 'next/link';

interface NavItem {
  readonly label: string;
  readonly href: string;
}

interface NavGroup {
  readonly title: string;
  readonly items: ReadonlyArray<NavItem>;
}

const GROUPS: ReadonlyArray<NavGroup> = [
  {
    title: 'Start',
    items: [
      { label: 'Overview', href: '/docs/' },
      { label: 'Quickstart', href: '/docs/quickstart/' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { label: 'API', href: '/docs/api/' },
      { label: 'Options', href: '/docs/options/' },
      { label: 'Events', href: '/docs/events/' },
      { label: 'Plugins', href: '/docs/plugins/' },
    ],
  },
  {
    title: 'Examples',
    items: [
      { label: 'All examples', href: '/examples/' },
    ],
  },
];

export function DocsSidebar() {
  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-[var(--color-rule)] lg:block">
      <nav aria-label="Docs navigation" className="sticky top-[var(--nav-h)] px-6 py-10">
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              {g.title}
            </div>
            <ul className="flex flex-col gap-1.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="text-[13px] text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)] motion-reduce:transition-none"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
