# @snapdeck/core — utils

Small, pure helpers used across the core engine. No DOM side effects
unless a helper is explicitly browser-scoped.

## API

- `clamp(n, min, max)` — inclusive clamp. NaN propagates. When `min > max`, returns `min`.
- `resolveIndex(target, items)` — resolves an `AnchorOrIndex`:
  - number passthrough (caller validates range),
  - string: exact case-sensitive match against `items[i].anchor`,
  - returns `-1` when not found or list is empty.
- `directionBetween(from, to)` — `'up' | 'down' | 'none'` for vertical index deltas.
- `oppositeVertical(d)` — swaps `'up' <-> 'down'`, leaves others unchanged.
- `oppositeHorizontal(d)` — swaps `'left' <-> 'right'`, leaves others unchanged.
- `isBrowser()` — true when both `window` and `document` exist.
- `prefersReducedMotion()` — reads `matchMedia('(prefers-reduced-motion: reduce)')`.
  Returns `false` outside the browser or when `matchMedia` is missing.
- `nextFrame()` — resolves on the next `requestAnimationFrame`. Falls back to
  `setTimeout(0)` when rAF is unavailable.
- `deepFreeze(obj)` — recursively freezes plain objects and arrays.
  Functions, Dates, Maps, Sets are skipped. Cycle-safe via a WeakSet.
  Returns the same reference.

## Design notes

- All helpers are stateless and side-effect free at import time.
- ESM `.js` extensions are used for intra-package imports to keep the
  bundle compatible with strict Node ESM resolution.
- No mutation: `deepFreeze` is the only module that touches its input, and
  it only tightens (never changes) existing properties.
