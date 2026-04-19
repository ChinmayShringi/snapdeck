# @snapdeck/plugin-observer

Narrow MutationObserver-based auto-refresh for Snapdeck. When sections are
added or removed as direct children of the Snapdeck container, the plugin
debounces and calls `instance.refresh()` for you.

## Install

```bash
pnpm add @snapdeck/plugin-observer
```

## Usage

```ts
import { snapdeck } from '@snapdeck/core';
import { observer } from '@snapdeck/plugin-observer';

const fp = snapdeck('#fullpage', {
  plugins: [observer({ debounceMs: 100 })],
});
```

## Options

| Option            | Type     | Default                       |
| ----------------- | -------- | ----------------------------- |
| `debounceMs`      | `number` | `100`                         |
| `sectionSelector` | `string` | `instance.getOption('sectionSelector')` |

## Tradeoff vs explicit `refresh()`

Calling `instance.refresh()` yourself after a known DOM change is always
cheaper and more predictable than observing the DOM. Use this plugin when:

- Sections are injected by code you do not control (CMS widgets, framework
  portals, third-party embeds).
- You want defensive auto-recovery from out-of-band DOM mutations.

Prefer explicit `refresh()` when:

- You own the code that mutates the section list.
- You need deterministic timing (no debounce window).

## Scope and limitations

- Observes only `childList` on the container, `subtree: false`. Nested subtree
  changes, attribute changes, and text-only mutations are deliberately
  ignored.
- Only mutations whose added/removed nodes match the section selector trigger
  a refresh. Unrelated sibling nodes are filtered out.
- Container is resolved as `state.sections[0].element.parentElement`. If there
  are zero sections at install time, the plugin is a no-op for that instance.
- If the runtime lacks `MutationObserver` (very old environments, some SSR
  shims), `install` and `destroy` are both no-ops and you should fall back to
  explicit `refresh()` calls.

## License

MIT
