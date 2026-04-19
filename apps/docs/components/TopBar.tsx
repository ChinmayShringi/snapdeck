import Link from 'next/link';
import { Logo } from './Logo';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function TopBar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b border-[var(--color-rule)] backdrop-blur-md"
      style={{ height: 'var(--nav-h)', background: 'rgba(10, 10, 10, 0.82)' }}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight"
          aria-label="Snapdeck home"
        >
          <Logo size={18} className="text-[var(--color-accent)]" />
          <span>Snapdeck</span>
          <span className="font-mono text-[11px] font-normal text-[var(--color-ink-faint)]">
            v1
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-[13px] text-[var(--color-ink-dim)]">
          <Link
            href="/docs/"
            className="transition-colors hover:text-[var(--color-ink)]"
          >
            Docs
          </Link>
          <Link
            href="/examples/"
            className="transition-colors hover:text-[var(--color-ink)]"
          >
            Examples
          </Link>
          <a
            href="https://github.com/ChinmayShringi/snapdeck"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-1.5 transition-colors hover:text-[var(--color-ink)] sm:flex"
          >
            <span>GitHub</span>
            <span aria-hidden="true">↗</span>
          </a>
          <Link
            href="/docs/quickstart/"
            className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-accent)] hover:border-[var(--color-accent)] motion-reduce:transition-none"
          >
            Get started
          </Link>
        </nav>
      </div>
      <noscript aria-hidden="true" />
      {basePath ? null : null}
    </header>
  );
}
