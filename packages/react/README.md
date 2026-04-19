# @snapdeck/react

React bindings for [Snapdeck](https://github.com/ChinmayShringi/snapdeck), a framework-agnostic section-snap scroll library. Tiny, typed, MIT-licensed. Independent clean-room implementation (not derived from any GPL scroll library).

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)

Provides: `useSnapdeck` (mount hook with callback ref), `useSnapdeckEvent` (event subscription with stable handler ref), `SnapdeckProvider` (context). SSR-safe, works in Next.js App Router, Remix, and Vite SSR.

## Install

```bash
npm install @snapdeck/react @snapdeck/core
# peers: react >=18, react-dom >=18
```

## Usage

```tsx
'use client'; // if you're in Next.js App Router

import { useSnapdeck, useSnapdeckEvent } from '@snapdeck/react';
import '@snapdeck/core/css';

function Deck() {
  const { ref, api } = useSnapdeck({
    scrollingSpeed: 700,
    easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    anchors: ['intro', 'features', 'pricing'],
  });

  useSnapdeckEvent('afterLoad', ({ destination }) => {
    console.log('now on', destination.index, destination.anchor);
  });

  return (
    <div ref={ref} id="deck">
      <section data-snapdeck-section data-anchor="intro">…</section>
      <section data-snapdeck-section data-anchor="features">…</section>
      <section data-snapdeck-section data-anchor="pricing">…</section>
    </div>
  );
}
```

### With plugins

```tsx
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';

const { ref } = useSnapdeck({
  plugins: [navDots(), progressBar({ position: 'top' })],
});
```

### Sharing the instance via context

```tsx
import { SnapdeckProvider, useSnapdeckContext } from '@snapdeck/react';

function Shell() {
  const { ref, api } = useSnapdeck({ anchors: ['a', 'b'] });
  return (
    <SnapdeckProvider value={api}>
      <div ref={ref}>…</div>
      <GoToB />
    </SnapdeckProvider>
  );
}

function GoToB() {
  const api = useSnapdeckContext();
  return <button onClick={() => api?.moveTo('b')}>Jump</button>;
}
```

## Important: options are not reactive

`useSnapdeck(options)` reads `options` **once**, at mount. Rebuilding on every render would destroy scroll state. To update at runtime, call `api.setOption(key, value)` on a runtime-safe key (speed, easing, etc.), full list in the core docs.

## Events

| Event | Payload fields (key ones) |
| --- | --- |
| `beforeLeave` | `origin`, `destination`, `direction`, return `false` to cancel |
| `onLeave` | same as above, return `false` to cancel |
| `afterLoad` | `origin`, `destination`, `direction` |
| `afterRender` | `container` |
| `afterResize` | `width`, `height` |
| `beforeSlideLeave` / `onSlideLeave` / `afterSlideLoad` | horizontal slide events |

## Migrating from fullpage.js v4 (React)

Use [`@snapdeck/v4-compat`](https://www.npmjs.com/package/@snapdeck/v4-compat) for a zero-refactor drop-in, or this package for idiomatic React.

## License

MIT. Independent clean-room implementation.
