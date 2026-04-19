# @snapdeck/plugin-lazy-media

Lazy-load `<img>`, `<video>`, `<iframe>` and `<source>` media per Snapdeck
section. Media is hydrated for the active section plus adjacent neighbors on
install and on every `afterLoad`.

## Install

```bash
pnpm add @snapdeck/core @snapdeck/plugin-lazy-media
```

## Usage

Mark lazy media with `data-src` (and optionally `data-srcset` /
`data-poster`). The plugin transfers these to the real attributes when the
host section becomes eager.

```html
<div id="deck">
  <section>
    <img data-src="/hero.jpg" alt="hero" />
  </section>
  <section>
    <img
      data-src="/wide.jpg"
      data-srcset="/wide@1x.jpg 1x, /wide@2x.jpg 2x"
      alt="wide"
    />
    <video data-src="/clip.mp4" data-poster="/clip-poster.jpg"></video>
    <iframe data-src="https://example.com/embed"></iframe>
  </section>
</div>
```

```ts
import snapdeck from '@snapdeck/core';
import { lazyMedia } from '@snapdeck/plugin-lazy-media';

snapdeck('#deck', {
  plugins: [lazyMedia({ eagerAdjacent: 1 })],
});
```

## Options

| Option           | Default                                  | Purpose                                       |
| ---------------- | ---------------------------------------- | --------------------------------------------- |
| `attribute`      | `'data-src'`                             | Source attribute transferred to `src`.        |
| `eagerSections`  | `1`                                      | Sections to hydrate at init from the active.  |
| `eagerAdjacent`  | `1`                                      | Neighbors around active to pre-hydrate.       |
| `mediaSelectors` | `['img', 'video', 'iframe', 'source']`   | CSS selectors scanned inside each section.    |

Sibling attributes (`data-srcset`, `data-poster`) are derived from the base
`attribute` so `attribute: 'data-lazy-src'` pairs with `data-lazy-srcset`.

The plugin is idempotent: once a node loses `data-src` it is never retouched.
`destroy()` detaches the listener but leaves already-hydrated media in place.
