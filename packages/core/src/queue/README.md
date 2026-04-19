# queue

Single-slot command queue with cooperative cancellation. Implements Section 9
of `docs/02-rebuild-recommendations.md`.

## Purpose

Ensures only one animation (or arbitrary cancellable command) is in flight at
a time. A new `run()` cancels the prior command and starts immediately, which
eliminates `canScroll` flag races and the "input ignored mid-animation" UX
issue in the legacy code.

## API

```ts
interface Cancellable {
  readonly promise: Promise<void>;
  cancel(): void;
}

class CommandQueue {
  get isBusy(): boolean;
  run(command: () => Cancellable): Promise<void>;
  cancel(): void;
}
```

## Semantics

- `run()` while busy: cancels in-flight, swallows its rejection internally,
  then starts the new command. The original `run()` caller of the cancelled
  command still receives the rejection on their awaited promise.
- `cancel()` when idle: no-op.
- `cancel()` when busy: cancels in-flight; its `run()` caller rejects.
- Re-entrant `run()` during a rejection unwind is safe (identity check in the
  `finally` block prevents clobbering a newer slot).

## Non-goals

- No multi-slot / FIFO queueing; explicitly single-slot.
- No timers, no global state.
- Does not know what a "command" does; callers supply `Cancellable`s.
