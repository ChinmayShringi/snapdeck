# @snapdeck/plugin-progress-bar

Top or bottom reading-progress bar for [Snapdeck](https://www.npmjs.com/package/@snapdeck/core). The fill width tracks the active section index via a CSS custom property, theme it however you like.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT

## Install

```bash
npm install @snapdeck/core @snapdeck/plugin-progress-bar
```

Import the default stylesheet once:

```ts
import '@snapdeck/plugin-progress-bar/css';
```

## Usage

```ts
import snapdeck from '@snapdeck/core';
import { progressBar } from '@snapdeck/plugin-progress-bar';
import '@snapdeck/core/css';
import '@snapdeck/plugin-progress-bar/css';

snapdeck('#deck', {
  plugins: [progressBar({ position: 'top', thickness: '3px' })],
});
```

## Options

| Option      | Type                | Default | Description                       |
| ----------- | ------------------- | ------- | --------------------------------- |
| `position`  | `'top' \| 'bottom'` | `'top'` | Where to pin the bar.             |
| `thickness` | `string`            | `'3px'` | Any CSS length.                   |
| `color`     | `string`            | unset   | Fill color (CSS custom property). |
| `className` | `string`            | unset   | Extra class on the root element.  |

## Theming

The plugin only writes CSS custom properties. Override from your own CSS:

```css
.snapdeck-progress-bar {
  --snapdeck-progress-color: hotpink;
  --snapdeck-progress-bg: rgba(0, 0, 0, 0.12);
  --snapdeck-progress-transition: width 400ms cubic-bezier(0.2, 0.9, 0.2, 1);
}
```

## Lifecycle

- `install` appends a `<div class="snapdeck-progress-bar">` with a fill child to `document.body` and subscribes to `afterLoad`, `afterRender`, and `afterRebuild`.
- `destroy` unsubscribes and removes the element. Safe to install / destroy repeatedly.

## License

MIT. Independent clean-room implementation.
