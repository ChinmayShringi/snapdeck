import Link from 'next/link';

export const metadata = {
  title: 'Docs — Snapdeck',
};

export default function DocsOverviewPage() {
  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Docs / overview
      </div>
      <h1>Snapdeck.</h1>
      <p>
        Section-snap scroll library. Tiny typed core, tree-shakable plugins,
        framework wrappers for React, Vue, and Angular.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-px bg-[var(--color-rule)] md:grid-cols-3">
        <DocTile href="/docs/quickstart/" title="Quickstart" sub="Install and render in under 30 seconds." />
        <DocTile href="/docs/api/" title="API" sub="Factory, methods, events, types." />
        <DocTile href="/docs/plugins/" title="Plugins" sub="Nav dots, progress bar, lazy media, observer." />
        <DocTile href="/docs/options/" title="Options" sub="Every configurable option, typed." />
        <DocTile href="/docs/events/" title="Events" sub="Payload shapes and lifecycle." />
        <DocTile href="/examples/" title="Examples" sub="Working decks, one per feature." />
      </div>
    </>
  );
}

function DocTile({ href, title, sub }: { readonly href: string; readonly title: string; readonly sub: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 bg-[var(--color-canvas)] p-6 transition-colors hover:bg-[var(--color-canvas-raised)] motion-reduce:transition-none"
    >
      <div className="font-display text-lg font-semibold text-[var(--color-ink)]">{title}</div>
      <div className="text-sm text-[var(--color-ink-dim)]">{sub}</div>
      <div className="mt-auto pt-4 font-mono text-[11px] text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-accent)] motion-reduce:transition-none">
        read →
      </div>
    </Link>
  );
}
