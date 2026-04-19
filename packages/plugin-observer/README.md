# @snapdeck/plugin-observer

Narrow MutationObserver-based auto-refresh for [Snapdeck](https://www.npmjs.com/package/@snapdeck/core). When sections are added or removed, the plugin debounces and calls `instance.refresh()` for you, no explicit wire-up needed.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT

## Install

```bash
npm install @snapdeck/core @snapdeck/plugin-observer
```

## Usage

```ts
import snapdeck from '@snapdeck/core';
import { observer } from '@snapdeck/plugin-observer';
import '@snapdeck/core/css';

snapdeck('#deck', {
  plugins: [observer({ debounceMs: 100 })],
});
```

## Options

| Option            | Type     | Default                                 |
| ----------------- | -------- | --------------------------------------- |
| `debounceMs`      | `number` | `100`                                   |
| `sectionSelector` | `string` | `instance.getOption('sectionSelector')` |

## When to use it (vs explicit `refresh()`)

Calling `instance.refresh()` yourself is always cheaper and more predictable. Use this plugin when:

- Sections are injected by code you don't control (CMS widgets, framework portals, third-party embeds).
- You want defensive auto-recovery from out-of-band DOM mutations.

Prefer explicit `refresh()` when:

- You own the code that mutates the section list.
- You need deterministic timing (no debounce window).

## Scope and limitations

- Observes only `childList`, `subtree: false`. Attribute and deep-nested changes are deliberately ignored.
- Only mutations whose added/removed nodes match the section selector trigger a refresh.
- Container is resolved as `state.sections[0].element.parentElement`. If there are zero sections at install time, the plugin is a no-op.
- If the runtime lacks `MutationObserver`, `install` and `destroy` are both no-ops.

## License

MIT. Independent clean-room implementation.
