import Link from 'next/link';

export const metadata = {
  title: 'Examples — Snapdeck',
  description: 'Live Snapdeck examples: basic, nav dots, progress bar.',
};

export default function ExamplesPage() {
  return (
    <main className="container">
      <h1>Examples</h1>
      <p className="muted">Each example is a full-viewport live demo using the library itself.</p>

      <div className="grid grid-3" style={{ marginTop: 24 }}>
        <Link className="card" href="/examples/basic/">
          <h3>Basic</h3>
          <p className="muted">A plain deck with five sections, no plugins.</p>
        </Link>
        <Link className="card" href="/examples/with-nav-dots/">
          <h3>With nav dots</h3>
          <p className="muted">Vertical dot navigation strip.</p>
        </Link>
        <Link className="card" href="/examples/with-progress-bar/">
          <h3>With progress bar</h3>
          <p className="muted">Thin top bar tracking section index.</p>
        </Link>
      </div>
    </main>
  );
}
