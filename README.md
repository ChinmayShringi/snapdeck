# Snapdeck

Modern, framework-agnostic section-snap scroll library. Tiny core, typed API, tree-shakable plugins, MIT licensed.

Target: evergreen browsers (last 3 years of Chrome, Firefox, Safari, Edge). ES2022. Zero runtime dependencies.

## Packages

- `@snapdeck/core` — framework-agnostic engine. ~15-20 KB minified target.
- `@snapdeck/react` — React hooks wrapper.
- `@snapdeck/vue` — Vue composable wrapper.
- `@snapdeck/v4-compat` — optional drop-in shim for fullpage.js v4 users.

## Quick start (planned API)

```ts
import snapdeck from "@snapdeck/core";

const deck = snapdeck("#deck", {
  scrollingSpeed: 700,
  anchors: ["intro", "features", "pricing"],
});

deck.on("afterLoad", ({ destination }) => {
  console.log("on section", destination.anchor);
});

await deck.moveTo("pricing");
```

## Status

Early development. See `docs/02-rebuild-recommendations.md` for the architecture target and `docs/01-weak-spots-catalogue.md` for the weak-spot inventory driving design decisions.

## License

MIT. See `LICENSE`.

## Independence statement

Snapdeck is an independent implementation built against public web platform APIs (Element.animate, Pointer Events, ResizeObserver, IntersectionObserver, matchMedia, scroll-snap) and a public architectural recommendation set. It is not a fork, port, or derivative of any GPL-licensed scroll library. Contributors who have read GPL-licensed internals of similar projects must not contribute implementation code.
