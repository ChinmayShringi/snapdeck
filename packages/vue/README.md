# @snapdeck/vue

Vue 3 composables for [Snapdeck](https://github.com/), the section-snap scroll engine.

## Install

```bash
pnpm add @snapdeck/vue @snapdeck/core vue
```

## Usage

```vue
<script setup lang="ts">
import { useSnapdeck, useSnapdeckEvent } from '@snapdeck/vue';

const { containerRef, api } = useSnapdeck({ scrollingSpeed: 700 });

useSnapdeckEvent('afterLoad', ({ destination }) => {
  console.log('landed on section', destination.index);
});

function next(): void {
  api.value?.moveDown();
}
</script>

<template>
  <div ref="containerRef" class="snapdeck">
    <section class="sd-section"><h1>One</h1></section>
    <section class="sd-section"><h1>Two</h1></section>
    <section class="sd-section"><h1>Three</h1></section>
  </div>
</template>
```

## API

### `useSnapdeck(options?)`

Returns `{ containerRef, api }`. Assign `containerRef` to the root element of your deck. The instance is constructed in `onMounted` and destroyed when the effect scope disposes.

SSR safe: the composable is a no-op on the server.

### `useSnapdeckEvent(name, handler, apiRef?)`

Subscribe to any Snapdeck event for the active instance. The instance is resolved via `provide/inject` by default (the matching `useSnapdeck` call in an ancestor). If you do not use provide/inject, pass the ref returned by `useSnapdeck` as the third argument.

```ts
useSnapdeckEvent('afterLoad', handler, api);
```

Automatic cleanup: the listener is removed when the effect scope disposes or when the instance ref flips to `null`.

## License

MIT
