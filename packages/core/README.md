# @snapdeck/core

Framework-agnostic section-snap scroll engine. Tiny, typed, zero runtime deps. MIT.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT. Clean-room independent implementation. Not derived from any GPL scroll library.

Snapdeck gives you one-page, section-snapping vertical scroll (with optional horizontal sub-slides) built on the modern web platform: Web Animations API, Pointer Events, IntersectionObserver, ResizeObserver, `matchMedia`. No jQuery, no polyfills, no hidden runtime.

## Install

```bash
npm install @snapdeck/core
# or
pnpm add @snapdeck/core
# or
yarn add @snapdeck/core
```

Import the stylesheet once from your app entry:

```ts
import '@snapdeck/core/css';
```

## Minimal usage

```html
<div id="deck">
  <section data-snapdeck-section data-anchor="intro">…</section>
  <section data-snapdeck-section data-anchor="features">…</section>
  <section data-snapdeck-section data-anchor="pricing">…</section>
</div>
```

```ts
import snapdeck from '@snapdeck/core';
import '@snapdeck/core/css';

const deck = snapdeck('#deck', {
  scrollingSpeed: 700,
  easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
});

deck.on('afterLoad', ({ destination }) => {
  console.log('now on section', destination.index, destination.anchor);
});

deck.moveTo('features');     // by anchor
deck.moveTo(2);              // by index
deck.moveSectionDown();      // relative
```

## Framework wrappers

| Package | Install |
| --- | --- |
| React | `npm i @snapdeck/react @snapdeck/core` |
| Vue 3 | `npm i @snapdeck/vue @snapdeck/core` |
| Angular (standalone) | `npm i @snapdeck/angular @snapdeck/core` |

## Plugins (opt-in, tree-shakable)

| Package | What it does |
| --- | --- |
| [`@snapdeck/plugin-nav-dots`](https://www.npmjs.com/package/@snapdeck/plugin-nav-dots) | Right/left-edge dot nav with `aria-current`. |
| [`@snapdeck/plugin-progress-bar`](https://www.npmjs.com/package/@snapdeck/plugin-progress-bar) | Top/bottom reading-progress bar via CSS custom properties. |
| [`@snapdeck/plugin-lazy-media`](https://www.npmjs.com/package/@snapdeck/plugin-lazy-media) | Transfers `data-src` → `src` for active + adjacent sections. |
| [`@snapdeck/plugin-observer`](https://www.npmjs.com/package/@snapdeck/plugin-observer) | Narrow MutationObserver that calls `refresh()` on content changes. |

```ts
import snapdeck from '@snapdeck/core';
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';

const deck = snapdeck('#deck', {
  plugins: [navDots(), progressBar({ position: 'top' })],
});
```

## Migrating from fullpage.js v4

Drop-in shim, no code changes, just a dependency swap:

```bash
npm uninstall fullpage.js
npm install @snapdeck/v4-compat @snapdeck/core
```

```ts
import fullpage from '@snapdeck/v4-compat';

const fp = fullpage('#fullpage', {
  sectionsColor: ['#fff', '#eee', '#ddd'],
  anchors: ['first', 'second', 'third'],
  afterLoad: (origin, destination, direction) => { /* ... */ },
});
```

## Core API

```ts
interface SnapdeckInstance {
  getState(): SnapdeckState;
  moveTo(target: number | string, opts?: { immediate?: boolean }): Promise<void>;
  moveSectionUp(): Promise<void>;
  moveSectionDown(): Promise<void>;
  moveSlideLeft(): Promise<void>;
  moveSlideRight(): Promise<void>;
  silentMoveTo(target: number | string): void;
  refresh(): void;
  setOption<K>(key: K, value: unknown): void;
  getOption<K>(key: K): unknown;
  on(event, handler): () => void;
  destroy(): void;
}
```

Events: `beforeLeave`, `onLeave`, `afterLoad`, `afterRender`, `afterResize`, `afterResponsive`, `afterRebuild`, `beforeSlideLeave`, `onSlideLeave`, `afterSlideLoad`. Return `false` from `beforeLeave` / `onLeave` to cancel a navigation.

Full reference: [chinmayshringi.github.io/snapdeck/docs](https://chinmayshringi.github.io/snapdeck/docs/).

## Architecture invariants

- Immutable state; reducers return new refs on mutations.
- Typed event bus; instance-scoped and error-isolated.
- Single-slot command queue, new nav cancels any in-flight animation cleanly.
- WAAPI scroll engine; `prefers-reduced-motion` takes a synchronous fast path.
- Wheel input time-debounced; touch uses Pointer Events only.
- Instance-per-container (no globals). Two Snapdecks on one page work independently.
- SSR-safe, mount effects run only on the client.

## License & origin

MIT. Snapdeck is an **independent clean-room implementation**, no code or documentation derived from `alvarotrigo/fullpage.js` or any other GPL scroll library.
