# @snapdeck/core — plugins

Plugins extend a Snapdeck instance without coupling to core internals. The core
exposes a minimal lifecycle and the `PluginRegistry` manages installation and
teardown per-instance.

## Plugin interface

```ts
interface Plugin {
  readonly name: string;          // unique per instance
  install(instance: SnapdeckInstance): void;
  destroy(): void;
}
```

A plugin should:

- Register listeners via `instance.on(...)` and keep the returned `Unsubscribe`
  functions so `destroy()` can clean them up.
- Not retain references to DOM nodes beyond its lifetime.
- Not mutate shared/core state directly.

## Registration lifecycle

1. During `snapdeck(...)` construction, each plugin in `options.plugins` is
   passed to `PluginRegistry.register(plugin, instance)`.
2. `register` throws synchronously if a plugin with the same `name` already
   exists, and does NOT call `install` in that case.
3. On `instance.destroy()`, the registry runs `destroyAll()` which invokes every
   `destroy()` in reverse insertion order. Errors from one plugin are caught,
   logged via `console.error`, and do not prevent others from running.
4. After `destroyAll()` the registry is emptied and safe to re-populate.

Introspection helpers: `has(name)`, `get(name)`, `list()` (snapshot).

## `definePlugin`

Identity helper that improves call-site type inference without wrapping the
plugin in any runtime indirection:

```ts
import { definePlugin } from '@snapdeck/core';

export const parallax = (opts: ParallaxOptions) =>
  definePlugin({
    name: 'parallax',
    install(fp) { /* ... */ },
    destroy() { /* ... */ },
  });
```

The registry is instance-scoped; there is no module-level state. Each Snapdeck
instance owns its own `PluginRegistry`.
