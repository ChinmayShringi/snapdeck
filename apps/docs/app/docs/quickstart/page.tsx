import { CodeBlock } from '../../../components/CodeBlock';
import { Tabs } from '../../../components/Tabs';

export const metadata = {
  title: 'Quickstart — Snapdeck',
};

const INSTALL_VANILLA = `npm install @snapdeck/core`;
const INSTALL_REACT = `npm install @snapdeck/core @snapdeck/react`;
const INSTALL_VUE = `npm install @snapdeck/core @snapdeck/vue`;
const INSTALL_ANGULAR = `npm install @snapdeck/core @snapdeck/angular`;

const CODE_VANILLA = `import snapdeck from '@snapdeck/core';
import '@snapdeck/core/css';

const api = snapdeck('#deck', {
  anchors: ['home', 'about', 'contact'],
  scrollingSpeed: 650,
});

api.on('afterLoad', ({ to }) => {
  console.log('now at', to.index);
});`;

const CODE_REACT = `'use client';
import { useSnapdeck } from '@snapdeck/react';
import '@snapdeck/core/css';

export function Deck() {
  const { ref } = useSnapdeck({
    anchors: ['home', 'about', 'contact'],
  });

  return (
    <div ref={ref}>
      <section data-snapdeck-section>Home</section>
      <section data-snapdeck-section>About</section>
      <section data-snapdeck-section>Contact</section>
    </div>
  );
}`;

const CODE_VUE = `<script setup lang="ts">
import { useSnapdeck } from '@snapdeck/vue';
import '@snapdeck/core/css';

const { ref } = useSnapdeck({
  anchors: ['home', 'about', 'contact'],
});
</script>

<template>
  <div :ref="ref">
    <section data-snapdeck-section>Home</section>
    <section data-snapdeck-section>About</section>
    <section data-snapdeck-section>Contact</section>
  </div>
</template>`;

const CODE_ANGULAR = `import { Component } from '@angular/core';
import { SnapdeckDirective } from '@snapdeck/angular';
import '@snapdeck/core/css';

@Component({
  standalone: true,
  imports: [SnapdeckDirective],
  template: \`
    <div snapdeck [options]="{ anchors: ['home', 'about', 'contact'] }">
      <section data-snapdeck-section>Home</section>
      <section data-snapdeck-section>About</section>
      <section data-snapdeck-section>Contact</section>
    </div>
  \`,
})
export class DeckComponent {}`;

const HTML_STARTER = `<div id="deck">
  <section data-snapdeck-section>Home</section>
  <section data-snapdeck-section>About</section>
  <section data-snapdeck-section>Contact</section>
</div>`;

export default function QuickstartPage() {
  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Docs / quickstart
      </div>
      <h1>Quickstart.</h1>
      <p>Pick your stack. Ship in one file.</p>

      <h2>Markup</h2>
      <p>Every deck needs sections with the <code>data-snapdeck-section</code> attribute.</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CodeBlock code={HTML_STARTER} lang="html" />

      <h2>Install &amp; mount</h2>
      <Tabs
        tabs={[
          {
            id: 'vanilla',
            label: 'vanilla',
            content: (
              <>
                <CodeBlock code={INSTALL_VANILLA} lang="bash" label="install" />
                <CodeBlock code={CODE_VANILLA} lang="ts" label="main.ts" />
              </>
            ),
          },
          {
            id: 'react',
            label: 'react',
            content: (
              <>
                <CodeBlock code={INSTALL_REACT} lang="bash" label="install" />
                <CodeBlock code={CODE_REACT} lang="tsx" label="Deck.tsx" />
              </>
            ),
          },
          {
            id: 'vue',
            label: 'vue',
            content: (
              <>
                <CodeBlock code={INSTALL_VUE} lang="bash" label="install" />
                <CodeBlock code={CODE_VUE} lang="vue" label="Deck.vue" />
              </>
            ),
          },
          {
            id: 'angular',
            label: 'angular',
            content: (
              <>
                <CodeBlock code={INSTALL_ANGULAR} lang="bash" label="install" />
                <CodeBlock code={CODE_ANGULAR} lang="angular-ts" label="deck.component.ts" />
              </>
            ),
          },
        ]}
      />

      <h2>Next</h2>
      <ul>
        <li>Read the <a href="/docs/api/">API reference</a></li>
        <li>See all <a href="/docs/options/">options</a></li>
        <li>Add <a href="/docs/plugins/">plugins</a></li>
      </ul>
    </>
  );
}
