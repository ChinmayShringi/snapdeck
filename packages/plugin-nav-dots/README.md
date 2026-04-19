# @snapdeck/plugin-nav-dots

Vertical dot-navigation plugin for [Snapdeck](https://www.npmjs.com/package/@snapdeck/core). Renders a fixed side strip with one dot per section, kept in sync with the active section via `aria-current`.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT

## Install

```bash
npm install @snapdeck/core @snapdeck/plugin-nav-dots
```

Import the stylesheet once in your app entry:

```ts
import '@snapdeck/plugin-nav-dots/css';
```

## Usage

```ts
import snapdeck from '@snapdeck/core';
import { navDots } from '@snapdeck/plugin-nav-dots';
import '@snapdeck/core/css';
import '@snapdeck/plugin-nav-dots/css';

snapdeck('#deck', {
  plugins: [
    navDots({
      position: 'right',
      tooltips: true,
      showActiveLabel: false,
    }),
  ],
});
```

## Options

| Option            | Type                | Default   | Description                                            |
| ----------------- | ------------------- | --------- | ------------------------------------------------------ |
| `position`        | `'left' \| 'right'` | `'right'` | Side of the viewport the strip is anchored to.         |
| `tooltips`        | `boolean`           | `false`   | Show the section label on hover / focus.               |
| `showActiveLabel` | `boolean`           | `false`   | Render the current section label next to the strip.    |
| `className`       | `string`            | `''`      | Extra space-separated classes appended to the `<nav>`. |

## Accessibility

- The strip is wrapped in `<nav aria-label="Snapdeck navigation">`.
- Each button's `aria-label` is the section's `data-anchor` when defined, otherwise `Section N` (1-indexed).
- The active dot carries `aria-current="true"` and an `is-active` class.
- Full keyboard support: focusable buttons fire `moveTo(index)` on click / space / enter.

## License

MIT. Independent clean-room implementation.
