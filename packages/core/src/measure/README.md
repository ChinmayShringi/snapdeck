# measure

Read-only measurement helpers for Snapdeck core. This module **never** writes
to the DOM: no `element.style`, no class changes. It only observes and reports.

## viewport

```ts
import { getViewportSize, matchResponsive } from '@snapdeck/core/measure';

getViewportSize(); // { width, height }; zeros in non-browser envs.

matchResponsive({ responsiveWidth: 900, responsiveHeight: 0 });
// true when either threshold > 0 and the viewport is below it.
// Uses matchMedia when available; falls back to innerWidth/innerHeight.
// Returns false when both thresholds are 0.
```

## sizeObserver

```ts
import { createSizeObserver, measureOnce } from '@snapdeck/core/measure';

const initial = measureOnce(el); // synchronous getBoundingClientRect read.

const handle = createSizeObserver(
  el,
  ({ width, height }) => console.log(width, height),
  { debounceMs: 120 },
);

handle.stop(); // idempotent; cancels any pending debounced callback.
```

- Uses `ResizeObserver` when available.
- **Fallback**: when `ResizeObserver` is missing (older environments), the
  observer subscribes to `window`'s `resize` event and re-measures the target
  with `getBoundingClientRect` on each fire. Debounce semantics are preserved.
- Initial size is *not* emitted synchronously — use `measureOnce` to avoid
  double-callbacks during setup.
- `stop()` disconnects the observer or removes the listener and clears any
  pending debounce timer.

## mediaWatcher

```ts
import { watchMedia } from '@snapdeck/core/measure';

const watcher = watchMedia('(max-width: 600px)', (matches) => {
  if (matches) /* enter responsive mode */;
});

watcher.matches(); // current state
watcher.stop();    // idempotent; removes the change listener.
```

When `window.matchMedia` is unavailable (SSR / non-browser), `watchMedia`
returns a no-op handle whose `matches()` reports `false`.
