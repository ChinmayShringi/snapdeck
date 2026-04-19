# @snapdeck/vue

Vue 3 composables for [Snapdeck](https://github.com/ChinmayShringi/snapdeck), a framework-agnostic section-snap scroll library. Tiny, typed, MIT-licensed. Independent clean-room implementation (not derived from any GPL scroll library).

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)

Provides: `useSnapdeck` (mount composable with containerRef), `useSnapdeckEvent` (event subscription via provide/inject or explicit ref). SSR-safe, the composable is a no-op on the server.

## Install

```bash
npm install @snapdeck/vue @snapdeck/core
# peer: vue >=3.4
```

## Usage

```vue
<script setup lang="ts">
import { useSnapdeck, useSnapdeckEvent } from '@snapdeck/vue';
import '@snapdeck/core/css';

const { containerRef, api } = useSnapdeck({
  scrollingSpeed: 700,
  anchors: ['intro', 'features', 'pricing'],
});

useSnapdeckEvent('afterLoad', ({ destination }) => {
  console.log('now on', destination.index);
});

function next(): void {
  api.value?.moveSectionDown();
}
</script>

<template>
  <div ref="containerRef" id="deck">
    <section data-snapdeck-section data-anchor="intro">…</section>
    <section data-snapdeck-section data-anchor="features">…</section>
    <section data-snapdeck-section data-anchor="pricing">…</section>
  </div>
  <button @click="next">Next</button>
</template>
```

### With plugins

```ts
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';

const { containerRef } = useSnapdeck({
  plugins: [navDots(), progressBar({ position: 'top' })],
});
```

## API

### `useSnapdeck(options?)`

Returns `{ containerRef, api }`. Assign `containerRef` to your deck root. Constructed in `onMounted`, destroyed via `onScopeDispose`. `api` is a `Ref<SnapdeckInstance | null>`, null until mounted, null after unmount.

### `useSnapdeckEvent(event, handler, apiRef?)`

Subscribes for as long as the effect scope is alive. Instance is resolved via `inject(SNAPDECK_KEY)` by default, an ancestor `useSnapdeck` call provides it automatically. Pass the ref returned by `useSnapdeck` explicitly as the third argument if you don't use provide/inject.

## License

MIT. Independent clean-room implementation.
