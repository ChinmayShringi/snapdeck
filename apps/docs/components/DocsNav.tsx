import Link from 'next/link';

export function DocsNav() {
  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar-inner">
        <Link href="/" className="brand">
          Snapdeck
        </Link>
        <div className="nav-links">
          <Link href="/docs/">Docs</Link>
          <Link href="/docs/getting-started/">Getting started</Link>
          <Link href="/docs/api/">API</Link>
          <Link href="/docs/plugins/">Plugins</Link>
          <Link href="/examples/">Examples</Link>
          <a
            href="https://github.com/ChinmayShringi/snapdeck"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
