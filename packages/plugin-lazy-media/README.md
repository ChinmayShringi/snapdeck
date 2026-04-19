# @snapdeck/plugin-lazy-media

Lazy-load `<img>`, `<video>`, `<iframe>`, and `<source>` per section for [Snapdeck](https://www.npmjs.com/package/@snapdeck/core). Media is hydrated for the active section plus adjacent neighbours on install and on every `afterLoad`.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT

## Install

```bash
npm install @snapdeck/core @snapdeck/plugin-lazy-media
```

## Usage

Mark lazy media with `data-src` (and optionally `data-srcset` / `data-poster`). The plugin transfers these to the real attributes when the host section becomes eager.

```html
<div id="deck">
  <section data-snapdeck-section>
    <img data-src="/hero.jpg" alt="hero" />
  </section>
  <section data-snapdeck-section>
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
import '@snapdeck/core/css';

snapdeck('#deck', {
  plugins: [lazyMedia({ eagerAdjacent: 1 })],
});
```

## Options

| Option           | Default                                  | Purpose                                       |
| ---------------- | ---------------------------------------- | --------------------------------------------- |
| `attribute`      | `'data-src'`                             | Source attribute transferred to `src`.        |
| `eagerSections`  | `1`                                      | Sections to hydrate at init, from the active. |
| `eagerAdjacent`  | `1`                                      | Neighbours around active to pre-hydrate.      |
| `mediaSelectors` | `['img', 'video', 'iframe', 'source']`   | CSS selectors scanned inside each section.    |

Sibling attributes (`data-srcset`, `data-poster`) are derived from the base `attribute`: `attribute: 'data-lazy-src'` pairs with `data-lazy-srcset`.

The plugin is idempotent, once a node loses `data-src` it's never retouched. `destroy()` detaches the listener but leaves already-hydrated media in place.

## License

MIT. Independent clean-room implementation.
