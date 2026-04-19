import Link from 'next/link';

export const metadata = {
  title: 'Docs — Snapdeck',
  description: 'Overview of the Snapdeck documentation.',
};

export default function DocsOverviewPage() {
  return (
    <main className="container">
      <h1>Documentation</h1>
      <p className="muted">
        Snapdeck is a modern, framework-agnostic section-snap scroll library. These pages cover
        installation, the core API, and built-in plugins.
      </p>

      <div className="grid grid-3" style={{ marginTop: 24 }}>
        <Link className="card" href="/docs/getting-started/">
          <h3>Getting started</h3>
          <p className="muted">Install, instantiate, and render your first deck.</p>
        </Link>
        <Link className="card" href="/docs/api/">
          <h3>API</h3>
          <p className="muted">Options, methods, events, and types.</p>
        </Link>
        <Link className="card" href="/docs/plugins/">
          <h3>Plugins</h3>
          <p className="muted">Nav dots, progress bar, lazy media.</p>
        </Link>
      </div>
    </main>
  );
}
