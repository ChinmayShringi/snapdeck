# `@snapdeck/core` event bus

Typed, instance-scoped event bus with error isolation and cancellation.

## API

```ts
import { EventBus } from '@snapdeck/core/events';
import type { SnapdeckEvents } from '@snapdeck/core';

const bus = new EventBus<SnapdeckEvents>();
```

| Method | Purpose |
| --- | --- |
| `on(event, handler)` | Subscribe. Returns an unsubscribe fn. Duplicate handlers are ignored. |
| `once(event, handler)` | Like `on`, but auto-removes after the first call. |
| `off(event, handler)` | Remove a specific handler. |
| `emit(event, ...args)` | Dispatch to every handler in insertion order. Returns `false` if any handler returned exactly `false`; handler exceptions are logged and do not stop propagation. |
| `clear()` | Remove every handler for every event. |
| `listenerCount(event?)` | Count subscribers for one event, or total. |

### Cancellation

Only an explicit `false` return cancels. `true`, `undefined`, and other values
do not.

### Error isolation

A handler that throws is caught and logged via `console.error`; subsequent
handlers still run.

## Example

```ts
const bus = new EventBus<SnapdeckEvents>();

const off = bus.on('afterLoad', ({ destination }) => {
  console.log('reached', destination.anchor);
});

bus.once('afterRebuild', () => console.log('rebuilt once'));

bus.on('beforeLeave', () => false); // cancels
const proceed = bus.emit('beforeLeave', payload);
if (!proceed) return;

off();
bus.clear();
```

Instance-scoped: two `EventBus` instances never share handlers.
