# @snapdeck/react

React bindings for [Snapdeck](../core), a framework-agnostic section-snap
scroll engine. Provides a `useSnapdeck` hook, a `useSnapdeckEvent` hook, and
a `SnapdeckProvider` context for sharing the instance across descendants.

## Install

```bash
pnpm add @snapdeck/react @snapdeck/core react react-dom
```

`react` and `react-dom` `>=18` are peer dependencies.

## Usage

```tsx
import { useSnapdeck, useSnapdeckEvent, SnapdeckProvider } from '@snapdeck/react';

function Deck() {
  const { ref, api } = useSnapdeck({ scrollingSpeed: 700 });

  useSnapdeckEvent('afterLoad', ({ destination }) => {
    console.log('landed on', destination.index);
  });

  return (
    <SnapdeckProvider value={api}>
      <div ref={ref} id="deck">
        <section data-snapdeck-section>1</section>
        <section data-snapdeck-section>2</section>
        <section data-snapdeck-section>3</section>
      </div>
    </SnapdeckProvider>
  );
}
```

### Options are not reactive

`useSnapdeck(options)` reads the initial `options` once. Changing options
later will **not** rebuild the instance (rebuilding would tear down scroll
state on every render). To update at runtime, call `api.setOption(key, value)`
directly on a whitelisted `RuntimeOptionKey`.

### Events and dependency arrays

`useSnapdeckEvent(event, handler, deps?)` stores `handler` in a ref, so the
**latest** closure is invoked even when `deps` defaults to `[]`. Provide a
`deps` array only when you want the subscription itself to be re-created.

### Next.js App Router

The hooks touch the DOM in effects only, so they are SSR-safe at module
eval. Mark the **consumer** component with `"use client"`:

```tsx
'use client';
import { useSnapdeck } from '@snapdeck/react';
// ...
```

This package intentionally omits the directive so it can be imported from
both server and client code.

## API

- `useSnapdeck(options?): { ref, api }` — creates one instance per mount.
- `useSnapdeckEvent(event, handler, deps?)` — subscribes while the
  provider is mounted; auto-unsubscribes on unmount.
- `SnapdeckProvider` — React context provider for the instance.
- Re-exports all public types from `@snapdeck/core`.

## License

MIT
