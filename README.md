# Snapdeck

**Section-snap scroll library for modern web. Zero runtime dependencies, tiny core, typed API, tree-shakable plugins, MIT-licensed.**

Snapdeck is a TypeScript library for building one-section-per-viewport scroll experiences (landing pages, portfolios, product tours, onboarding, pitch decks, marketing sites) that snap between discrete sections on wheel, keyboard, touch, and URL hash events. Core is framework-agnostic. First-party wrappers cover React, Vue, and Angular.

[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](#)
[![ESM + CJS](https://img.shields.io/badge/build-ESM%20%2B%20CJS-green)](#)
[![zero deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](#)

---

## Table of contents

- [What Snapdeck does](#what-snapdeck-does)
- [Why choose Snapdeck](#why-choose-snapdeck)
- [Install](#install)
- [Quick start (vanilla)](#quick-start-vanilla)
- [Quick start (React)](#quick-start-react)
- [Quick start (Vue)](#quick-start-vue)
- [Quick start (Angular)](#quick-start-angular)
- [Packages](#packages)
- [Public API](#public-api)
- [Options reference](#options-reference)
- [Events reference](#events-reference)
- [Plugins](#plugins)
- [Architecture](#architecture)
- [Browser support](#browser-support)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Migrating from fullpage.js v4](#migrating-from-fullpagejs-v4)
- [Development](#development)
- [License](#license)

---

## What Snapdeck does

Given a DOM container with N direct-child section elements, Snapdeck turns the container into a virtual scroll surface where:

- Each section fills the viewport (`100dvh`).
- Wheel, trackpad, keyboard, touch swipe, and URL hash changes navigate between sections.
- Animations use the Web Animations API with CSS `transform: translate3d(...)` on a single composited layer.
- Optional horizontal slides inside a section are driven the same way.
- A programmatic API (`moveTo`, `moveUp`, `moveDown`, `moveSlideLeft`, `moveSlideRight`) lets you drive navigation from anywhere.
- Events (`beforeLeave`, `afterLoad`, `afterSlideLoad`, etc.) let you react to transitions.
- Optional plugins add nav dots, progress bars, lazy media, dynamic-content refresh, and more.

## Why choose Snapdeck

| Property | Snapdeck |
| --- | --- |
| Runtime dependencies | 0 |
| Core bundle (ESM) | ~40 KB uncompressed, tree-shakes to less when plugins are omitted |
| TypeScript | first-class, strict, no `any` in public API |
| License | MIT (permissive, commercial-friendly, no dual license) |
| Framework coverage | vanilla, React, Vue, Angular — each <200 LOC wrapper over the same core |
| Animation engine | Web Animations API with native cancellation and reduced-motion support |
| Scroll input | Pointer Events (unified mouse/touch/pen), passive where safe, `wheel` with time-based debounce |
| State model | immutable state + typed reducer + instance-scoped event bus |
| Plugin model | each plugin is its own package, composable, error-isolated |
| SSR | hooks don't touch `window` at module evaluation; safe under Next.js, Nuxt, SvelteKit, Angular Universal |
| Accessibility | `prefers-reduced-motion` honored, keyboard navigation with `Home`/`End`/arrow/`PageUp`/`PageDown`/Space, ARIA-friendly nav plugins, focus not trapped |
| Multi-instance | two Snapdeck decks per page work independently, no globals |
| Build output | ESM + CJS + `.d.ts` + `.css` |

## Install

```bash
# pnpm
pnpm add @snapdeck/core

# npm
npm install @snapdeck/core

# yarn
yarn add @snapdeck/core

# bun
bun add @snapdeck/core
```

Framework wrappers:

```bash
pnpm add @snapdeck/react   # + react >= 18
pnpm add @snapdeck/vue     # + vue ^3.4
pnpm add @snapdeck/angular # + @angular/core >= 18
```

Plugins:

```bash
pnpm add @snapdeck/plugin-nav-dots
pnpm add @snapdeck/plugin-progress-bar
pnpm add @snapdeck/plugin-lazy-media
pnpm add @snapdeck/plugin-observer
```

Legacy compat shim:

```bash
pnpm add @snapdeck/v4-compat
```

## Quick start (vanilla)

```html
<link rel="stylesheet" href="/node_modules/@snapdeck/core/dist/snapdeck.css" />

<div id="deck">
  <section data-snapdeck-section data-anchor="intro">Intro</section>
  <section data-snapdeck-section data-anchor="features">Features</section>
  <section data-snapdeck-section data-anchor="pricing">Pricing</section>
  <section data-snapdeck-section data-anchor="contact">Contact</section>
</div>

<script type="module">
  import snapdeck from '@snapdeck/core';
  import '@snapdeck/core/css';

  const deck = snapdeck('#deck', {
    scrollingSpeed: 700,
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    loopTop: false,
    loopBottom: false,
  });

  deck.on('afterLoad', ({ destination }) => {
    console.info('on section', destination.anchor ?? destination.index);
  });

  // imperative navigation
  document.querySelector('#go').addEventListener('click', () => deck.moveTo('pricing'));
</script>
```

## Quick start (React)

```tsx
'use client'; // Next.js App Router

import { useSnapdeck, useSnapdeckEvent, SnapdeckProvider } from '@snapdeck/react';
import '@snapdeck/core/css';

export function Deck() {
  const { ref, api } = useSnapdeck({ scrollingSpeed: 700 });

  useSnapdeckEvent('afterLoad', ({ destination }) => {
    console.info('on section', destination.index);
  });

  return (
    <SnapdeckProvider value={api}>
      <div ref={ref} id="deck">
        <section data-snapdeck-section>One</section>
        <section data-snapdeck-section>Two</section>
        <section data-snapdeck-section>Three</section>
      </div>
    </SnapdeckProvider>
  );
}
```

## Quick start (Vue)

```vue
<script setup lang="ts">
import { useSnapdeck, useSnapdeckEvent } from '@snapdeck/vue';
import '@snapdeck/core/css';

const { containerRef, api } = useSnapdeck({ scrollingSpeed: 700 });

useSnapdeckEvent('afterLoad', ({ destination }) => {
  console.info('on section', destination.index);
});
</script>

<template>
  <div :ref="containerRef" id="deck">
    <section data-snapdeck-section>One</section>
    <section data-snapdeck-section>Two</section>
    <section data-snapdeck-section>Three</section>
  </div>
</template>
```

## Quick start (Angular)

```ts
import { Component } from '@angular/core';
import { SnapdeckDirective } from '@snapdeck/angular';

@Component({
  standalone: true,
  imports: [SnapdeckDirective],
  template: `
    <div
      snapdeck
      #deck="snapdeck"
      [options]="{ scrollingSpeed: 700 }"
      (afterLoad)="onAfterLoad($event)"
    >
      <section data-snapdeck-section>One</section>
      <section data-snapdeck-section>Two</section>
      <section data-snapdeck-section>Three</section>
    </div>
    <button (click)="deck.api?.moveDown()">Next</button>
  `,
})
export class DeckComponent {
  onAfterLoad(payload: { destination: { index: number } }) {
    console.info('on section', payload.destination.index);
  }
}
```

## Packages

| Package | Purpose |
| --- | --- |
| `@snapdeck/core` | Framework-agnostic engine (store, event bus, scroll engine, input handlers, plugin registry) |
| `@snapdeck/react` | React 18/19 hooks + provider |
| `@snapdeck/vue` | Vue 3 composables with `provide`/`inject` wiring |
| `@snapdeck/angular` | Angular 18/19/20 standalone directive |
| `@snapdeck/plugin-nav-dots` | Vertical dot navigation strip with tooltips and ARIA |
| `@snapdeck/plugin-progress-bar` | Top/bottom reading-progress bar driven by CSS custom properties |
| `@snapdeck/plugin-lazy-media` | Transfer `data-src`/`data-srcset`/`data-poster` to real attributes on demand |
| `@snapdeck/plugin-observer` | Narrow MutationObserver watching direct children to auto-refresh |
| `@snapdeck/v4-compat` | Drop-in shim for users migrating from fullpage.js v4 |

All packages ship ESM + CJS + `.d.ts` and follow the monorepo's TS-strict settings.

## Public API

```ts
import snapdeck, {
  type SnapdeckInstance,
  type SnapdeckOptions,
  type SnapdeckState,
  type Section,
  type Slide,
  type NavigationPayload,
  type SlideNavigationPayload,
  type Trigger,
  type Direction,
  type Plugin,
} from '@snapdeck/core';

const deck: SnapdeckInstance = snapdeck(container, options);

// inspection
deck.state;             // Readonly<SnapdeckState>
deck.activeSection;     // Section | null
deck.activeSlide;       // Slide | null

// commands (return Promise<void>, resolve on animation end, reject on cancellation)
await deck.moveTo(targetOrAnchor, optionalSlide);
await deck.moveUp();
await deck.moveDown();
await deck.moveSlideLeft();
await deck.moveSlideRight();
deck.silentMoveTo(targetOrAnchor);   // no animation, no callbacks

// events (return an unsubscribe fn)
const off = deck.on('afterLoad', (payload) => { /* ... */ });
off();

// runtime option setters (only RuntimeOptionKey keys)
deck.setOption('scrollingSpeed', 500);
deck.getOption('scrollingSpeed');

// lifecycle
deck.refresh();   // re-scan DOM after dynamic content changes
deck.destroy();
```

## Options reference

All options are optional; defaults shown.

| Option | Type | Default | Runtime-settable |
| --- | --- | --- | --- |
| `sectionSelector` | `string` | `'[data-snapdeck-section]'` | no |
| `slideSelector` | `string` | `'[data-snapdeck-slide]'` | no |
| `anchors` | `ReadonlyArray<string>` | `[]` | no |
| `scrollingSpeed` | `number` (ms) | `700` | yes |
| `easing` | `string` | `'cubic-bezier(0.25, 0.1, 0.25, 1)'` | yes |
| `loopTop` | `boolean` | `false` | yes |
| `loopBottom` | `boolean` | `false` | yes |
| `responsiveWidth` | `number` (px) | `0` | no |
| `responsiveHeight` | `number` (px) | `0` | no |
| `keyboardScrolling` | `boolean` | `true` | yes |
| `wheelDebounceMs` | `number` | `200` | yes |
| `touchSensitivityPct` | `number` (0..100) | `5` | yes |
| `fitToSection` | `boolean` | `true` | yes |
| `fitToSectionDelayMs` | `number` | `1000` | yes |
| `lazyLoading` | `boolean` | `true` | yes |
| `recordHistory` | `boolean` | `true` | yes |
| `lockAnchors` | `boolean` | `false` | yes |
| `css3` | `boolean` | `true` | no |
| `plugins` | `ReadonlyArray<Plugin>` | `[]` | no |

## Events reference

| Event | Payload | Cancellable |
| --- | --- | --- |
| `beforeLeave` | `NavigationPayload` | yes (return `false`) |
| `onLeave` | `NavigationPayload` | yes (return `false`) |
| `afterLoad` | `NavigationPayload` | no |
| `afterRender` | `{ activeSection: Section }` | no |
| `afterResize` | `{ width, height }` | no |
| `afterResponsive` | `boolean` | no |
| `onSlideLeave` | `SlideNavigationPayload` | yes |
| `afterSlideLoad` | `SlideNavigationPayload` | no |
| `afterRebuild` | `()` | no |
| `onScrollOverflow` | `OverflowPayload` | no (reserved) |

`NavigationPayload` is `{ origin: Section, destination: Section, direction: Direction, trigger: Trigger }`. `Trigger` is one of `'wheel' | 'touch' | 'keyboard' | 'api' | 'anchor' | 'init'`.

## Plugins

Plugins are objects that conform to:

```ts
interface Plugin {
  readonly name: string;
  install(instance: SnapdeckInstance): void;
  destroy(): void;
}
```

Pass them via the `plugins` option:

```ts
import snapdeck from '@snapdeck/core';
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';
import { lazyMedia } from '@snapdeck/plugin-lazy-media';
import { observer } from '@snapdeck/plugin-observer';

const deck = snapdeck('#deck', {
  plugins: [
    navDots({ position: 'right', tooltips: true }),
    progressBar({ position: 'top', thickness: '3px' }),
    lazyMedia({ eagerAdjacent: 1 }),
    observer({ debounceMs: 100 }),
  ],
});
```

Every plugin is its own npm package — consumers only pay for what they import.

## Architecture

Snapdeck is assembled from small modules that speak through a single immutable state store and a typed event bus.

```
┌──────────────────────────────────────────────────────────────┐
│                      Snapdeck instance                       │
│                                                              │
│   ┌───────────┐   ┌─────────────┐   ┌────────────────────┐   │
│   │   Store   │◀──│  Reducer    │◀──│   Actions (typed)  │   │
│   │ immutable │   └─────────────┘   └────────────────────┘   │
│   └─────▲─────┘                                              │
│         │                                                    │
│   ┌─────┴─────┐                                              │
│   │  EventBus │  typed, error-isolated, cancellable          │
│   └─────▲─────┘                                              │
│         │                                                    │
│   ┌─────┴──────────────────────────────────┐                 │
│   │ Scroll engine (Element.animate)        │                 │
│   │ Command queue (single-slot, cancel)    │                 │
│   │ DOM mount + ResizeObserver + matchMedia│                 │
│   └─────▲──────────────────────────────────┘                 │
│         │                                                    │
│   ┌─────┴─────┬──────────┬──────────┬──────────┐             │
│   │   Wheel   │  Touch   │ Keyboard │ Anchors  │             │
│   │  (debounce│ (pointer │ (a11y-   │ (history │             │
│   │  by time) │   events)│  aware)  │  API)    │             │
│   └───────────┴──────────┴──────────┴──────────┘             │
│                                                              │
│   ┌───────────────── Plugin registry ─────────────────┐      │
│   │ nav-dots · progress-bar · lazy-media · observer · │      │
│   │ custom user plugins                               │      │
│   └───────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**Principles**

- **Immutable state.** Every reducer return is a new object (or the same reference if nothing changed). Subscribers diff by reference.
- **Typed event bus.** `EventBus<SnapdeckEvents>` gives full IntelliSense on `on('afterLoad', ({ destination }) => destination.index)`.
- **Single-slot command queue.** Mid-flight animations are cancelled when a new command arrives; no acceleration heuristics, no magic timers.
- **Web platform first.** `Element.animate`, `ResizeObserver`, `matchMedia`, `pointerdown`/`pointermove`/`pointerup`, `history.pushState` — nothing custom where a standard exists.
- **Zero globals.** Two Snapdeck decks on one page are fully isolated.

## Browser support

Evergreen browsers from the last 3 years (Chrome/Edge 100+, Firefox 100+, Safari 15+). No IE, no legacy Safari. Desktop and mobile. Reduced-motion preference is honored automatically — duration collapses to 0 and transitions become instant.

## Accessibility

- Keyboard: `ArrowUp`/`ArrowDown`/`PageUp`/`PageDown`/`Home`/`End`/`Space`/`Shift+Space`/`ArrowLeft`/`ArrowRight`.
- Inputs inside `<input>`/`<textarea>`/`contenteditable` are not hijacked.
- Modifier-key combos (`Ctrl`, `Meta`, `Alt`) are passed through to the browser.
- `@snapdeck/plugin-nav-dots` adds `aria-current="true"` to the active button and an `aria-label` per dot.
- `prefers-reduced-motion: reduce` respected automatically.
- Focus management: Snapdeck does not trap focus; consumers can manage focus on section change via `afterLoad`.

## Performance

- One composited layer: the entire deck container, animated via `transform: translate3d(...)`.
- `requestAnimationFrame` via `Element.animate` — no manual rAF loops, no `setInterval`.
- Wheel handler: one `performance.now()` check per event. No array allocations, no averaging windows, no `slice`/`shift`.
- `ResizeObserver` debounced at 120ms trailing.
- Passive event listeners except where `preventDefault()` is required.
- Tree-shakable: the core pulls zero plugins unless you opt in.
- Measured core build: ~40 KB ESM uncompressed on the reference build. Plugins are each under 5 KB.

## Migrating from fullpage.js v4

`@snapdeck/v4-compat` is a shim that accepts v4-style options and callbacks and wires them to Snapdeck under the hood.

```ts
import fullpage from '@snapdeck/v4-compat';

new fullpage('#deck', {
  anchors: ['intro', 'features', 'pricing'],
  scrollingSpeed: 700,
  afterLoad(origin, destination, direction) {
    console.info('on section', destination.anchor);
  },
});

// window.fullpage_api is available for legacy code that reads it
window.fullpage_api.moveSectionDown();
```

Parity status: the 20 most common v4 patterns work unchanged. Unknown options emit a `console.warn`. Commercial v4 extensions are not shimmed. See the [`@snapdeck/v4-compat` README](./packages/v4-compat/README.md) for the full parity table.

## Development

This is a pnpm workspace.

```bash
pnpm install
pnpm typecheck   # every package
pnpm test:run    # every package
pnpm build       # every package
```

Example demo:

```bash
pnpm --filter example-basic-vertical dev
# open http://localhost:5173
```

## Docs

Full documentation, API reference, and live examples: https://chinmayshringi.github.io/snapdeck/

Source lives at [`apps/docs`](./apps/docs/) and deploys via [`.github/workflows/docs.yml`](./.github/workflows/docs.yml).

## License

MIT. See [LICENSE](./LICENSE).

---

## Keywords

`fullpage`, `fullpage.js`, `fullpage alternative`, `section scroll`, `snap scroll`, `one-page scroll`, `one page scroll`, `vertical slider`, `horizontal slides`, `scroll snap`, `CSS scroll snap`, `Web Animations API`, `TypeScript`, `React scroll library`, `Vue scroll library`, `Angular scroll library`, `Next.js landing page`, `Nuxt landing page`, `pitch deck web`, `portfolio scroll`, `product tour`, `onboarding flow`, `marketing site`, `MIT license scroll`, `permissive license scroll library`, `zero dependency`, `tree-shakable`, `accessible scroll`, `prefers-reduced-motion`, `keyboard navigation`, `pointer events`, `ResizeObserver`, `IntersectionObserver`, `ESM`, `framework agnostic`, `headless scroll`, `snapdeck`.
