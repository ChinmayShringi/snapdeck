import type { ReactNode } from 'react';
import { TopBar } from '../../components/TopBar';
import { DocsSidebar } from '../../components/DocsSidebar';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <div
        className="mx-auto flex max-w-[1200px]"
        style={{ paddingTop: 'var(--nav-h)' }}
      >
        <DocsSidebar />
        <main className="min-w-0 flex-1 px-6 py-12 md:px-12 lg:px-16">
          <article className="prose-snap max-w-[780px]">{children}</article>
        </main>
      </div>
    </>
  );
}
