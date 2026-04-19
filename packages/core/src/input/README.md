# Input

User-input adapters for the Snapdeck engine. Each adapter translates a raw
browser event stream into a minimal set of semantic calls (e.g. "navigate up /
down") and knows nothing about the engine internals. Adapters are pure
attach/detach units with no shared state.

Each adapter file exports:

- An `attach*Input(options)` factory that wires listeners and returns a
  `{ stop(): void }` handle.
- A typed `*InputOptions` interface describing the callbacks and DOM target.

Adapters never call `requestAnimationFrame`, never own timers, and never mutate
DOM. All policy (what happens on navigate, when to lock, etc.) is injected via
callbacks.

## Wheel

`./wheel.ts` — `attachWheelInput(options)`.

Time-debounced mouse/trackpad wheel handling. Replaces the legacy 150-entry
acceleration heuristic with a single timestamp and a configurable min-gap.

Behaviour:

- Listener registered with `{ passive: false }` so the handler can call
  `event.preventDefault()` and suppress native page scrolling.
- `shouldIgnore(event)` returning `true` skips the event entirely (no
  preventDefault, no navigation) — use this to let inner scrollable elements
  receive their native scroll.
- When not ignored, `preventDefault()` is always called.
- `isLocked()` returning `true` swallows the event (preventDefault is still
  called) but does not navigate — used while the engine is animating.
- `deltaY === 0` is ignored (horizontal-only wheel).
- If the time since the last fired event is `< debounceMs`, the event is
  dropped. Otherwise `onNavigate('up' | 'down')` is invoked based on
  `deltaY` sign.
- `stop()` is idempotent and removes the listener.

```ts
import { attachWheelInput } from '@snapdeck/core/input';

const handle = attachWheelInput({
  target: document.documentElement,
  debounceMs: 200,
  onNavigate: (dir) => engine.navigate(dir),
  shouldIgnore: (e) => isInsideScrollable(e.target as Element),
  isLocked: () => state.isAnimating,
});

// later
handle.stop();
```

<!--
Later input modules (touch, keyboard, anchors) should append their section
below using the same shape: file path, summary, behaviour bullets, example.
-->

## Touch

<!-- TODO: owned by touch-input team. -->

## Keyboard

<!-- TODO: owned by keyboard-input team. -->

## Anchors

<!-- TODO: owned by anchors-input team. -->
