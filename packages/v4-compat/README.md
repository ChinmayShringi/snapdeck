# @snapdeck/v4-compat

Drop-in compatibility shim for projects migrating from fullpage.js v4 to [Snapdeck](https://github.com/ChinmayShringi/snapdeck). Preserves the `fullpage('#id', {...})` constructor shape, v4 callback signatures, and `window.fullpage_api` so existing integration code keeps working.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT. Clean-room independent implementation.

This wrapper is clean-room original code. It never imports or reads the
fullpage.js source. Every behavior is derived from the publicly-documented
v4 API surface: option names, callback names, constructor shape, and the
`window.fullpage_api` methods.

## Install

```sh
pnpm add @snapdeck/core @snapdeck/v4-compat
```

## Minimal example

```ts
import fullpage from '@snapdeck/v4-compat';

const fp = fullpage('#fullpage', {
  anchors: ['home', 'about', 'contact'],
  scrollingSpeed: 700,
  afterLoad: (origin, destination, direction) => {
    console.log('moved', direction, 'to', destination.anchor);
  },
  onLeave: (origin, destination, direction) => {
    if (destination.index === 2 && direction === 'down') {
      return false; // cancel
    }
  },
});

// Later:
fp.moveSectionDown();
window.fullpage_api.moveTo('about');
```

HTML fixture:

```html
<div id="fullpage">
  <section data-snapdeck-section data-anchor="home">…</section>
  <section data-snapdeck-section data-anchor="about">…</section>
  <section data-snapdeck-section data-anchor="contact">…</section>
</div>
```

## Migrating from fullpage.js v4

Drop `import fullpage from 'fullpage.js'` and replace with
`import fullpage from '@snapdeck/v4-compat'`. Replace the CSS import with
`@snapdeck/core/css`. Add `data-snapdeck-section` to every section element.
Most option names and callback signatures are unchanged.

## Parity

| v4 API                                 | Status           |
| -------------------------------------- | ---------------- |
| `anchors`                              | Works            |
| `scrollingSpeed`, `easing`             | Works            |
| `loopTop`, `loopBottom`, `lockAnchors` | Works            |
| `keyboardScrolling`                    | Works            |
| `fitToSection`, `lazyLoading`          | Works            |
| `recordHistory`, `css3`                | Works            |
| `afterLoad(origin, dest, direction)`   | Works            |
| `onLeave(origin, dest, direction)`     | Works            |
| `beforeLeave(...)`                     | Works            |
| `afterRender()`                        | Works            |
| `afterResize(w, h)`                    | Works            |
| `afterResponsive(isResponsive)`        | Works            |
| `afterSlideLoad(section, o, d, dir)`   | Works            |
| `onSlideLeave(section, o, d, dir)`     | Works            |
| `moveTo`, `moveSectionUp/Down`         | Works            |
| `moveSlideLeft/Right`                  | Works            |
| `setKeyboardScrolling(bool)`           | Works            |
| `getActiveSection()`                   | Works            |
| `destroy()`, `destroy('all')`          | Works            |
| `reBuild()`                            | Works            |
| `setAutoScrolling(bool)`               | Not implemented  |
| `setAllowScrolling(bool)`              | Not implemented  |
| `navigation`, `slidesNavigation`       | Use plugins      |
| `parallax`, `cards`                    | Not implemented  |
| `continuousVertical`                   | Not implemented  |
| `scrollBar`, `scrollOverflow`          | Not implemented  |
| `licenseKey`                           | Ignored (no-op)  |

`navigation` is provided by
[`@snapdeck/plugin-nav-dots`](../plugin-nav-dots). `lazyLoading` can be
enabled via [`@snapdeck/plugin-lazy-media`](../plugin-lazy-media).

Unknown options emit a single `console.warn` and are dropped. Known but
unimplemented options are accepted silently to reduce migration noise.

## Limitations

Snapdeck is transform-based: the container is translated into position and
never scrolls, so `setAutoScrolling` has no runtime toggle. Both
`setAutoScrolling` and `setAllowScrolling` emit a warning and no-op; if you
relied on them at runtime, you will need to destroy/recreate the instance
with different options.

## License

MIT. This wrapper never imports GPL code.
