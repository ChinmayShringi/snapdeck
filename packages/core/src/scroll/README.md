# scroll/

Low-level scroll engine for Snapdeck. One animation path, no globals.

## engine.ts

`animateTransformY(target, fromY, toY, opts) -> ScrollAnimation`

Wraps `Element.animate` with a two-frame `translate3d` keyframe list. The
caller owns duration, easing, and the reduced-motion decision.

### Contract

- Returns a `ScrollAnimation` with:
  - `promise: Promise<void>`, resolves on natural completion, rejects with
    an `AbortError` (`err.name === 'AbortError'`) on cancellation.
  - `cancel()`, idempotent; no-op after finish.
  - `finished: boolean`, true once the animation has completed naturally.
  - `cancelled: boolean`, true once `cancel()` has taken effect.
- On completion, `animation.commitStyles()` is called so the final
  `transform` is written to `element.style`, then `animation.cancel()`
  clears the animation from the effect stack so the next call starts from
  a clean baseline.
- Reduced-motion fast path: if `opts.reducedMotion === true` **or**
  `opts.duration === 0`, the transform is set synchronously via
  `target.style.transform` and the promise resolves immediately.
- Fallback path: if `Element.prototype.animate` is unavailable (or the
  instance method is missing), the engine behaves as in the reduced-motion
  path. This keeps happy-dom tests and ancient engines functional.

### Non-goals

- Horizontal translation (slides handle their own transform).
- Reading options (`SnapdeckOptions.scrollingSpeed`, etc.). Callers map
  their config to `duration`/`easing` before calling.
- Queueing or cancellation across calls. A separate `queue` module owns
  that concern and reuses `animateTransformY` as its primitive.

### Cancellation semantics

`cancel()` sets `cancelled = true` and invokes `animation.cancel()`. The
pending `promise` rejects with an `AbortError`; callers can distinguish
cancellation via `err.name`.
