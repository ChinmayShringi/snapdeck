# @snapdeck/core — state store

Instance-scoped, strongly typed state container for a Snapdeck deck. Every
mutation flows through a single `dispatch(action)` entry point, so `grep
"dispatch"` enumerates every possible state transition.

## Files

- `actions.ts` — `Action` discriminated union.
- `reducer.ts` — pure `reduce(state, action): SnapdeckState`. Returns the
  same reference on no-op actions so the store can skip notifications.
- `store.ts` — `Store` class with `getState`, `dispatch`, `subscribe`.
- `initial-state.ts` — `createInitialState()` factory.

## Actions

| `type` | Payload | Effect |
| --- | --- | --- |
| `structure/set` | `sections`, `slides` | Replace the section + slide arrays. |
| `navigate/start` | `origin`, `destination`, `direction`, `trigger` | Begin a navigation; sets `isAnimating = true`. |
| `navigate/end` | `destination` | Commit a navigation; sets `isAnimating = false`. |
| `navigate/cancel` | — | Abort in-flight navigation. |
| `resize` | `width`, `height` | Update container dimensions. |
| `responsive/set` | `isResponsive` | Toggle responsive (disabled) mode. |
| `scroll/set` | `scrollX`, `scrollY` | Record the latest scroll position. |
| `canScroll/set` | `canScroll` | Gate input-driven navigation. |

## Store API

```ts
const store = new Store();                      // defaults to createInitialState()
const state = store.getState();                 // readonly snapshot
store.dispatch({ type: 'resize', width: 800, height: 600 });
const off = store.subscribe((next, prev) => {
  if (next.width !== prev.width) { /* react */ }
});
off(); // unsubscribe
```

Guarantees:

- Immutable state: reducer always returns a new object on change; callers
  never mutate the result.
- Reference-stable on no-op: dispatching the same effective action twice
  yields the same state reference and does not re-notify subscribers.
- Error-isolated subscribers: a throwing listener is caught, logged, and the
  remaining listeners still fire.
- Listener snapshot: subscribers added or removed during a notification
  observe the next dispatch, not the current one.
