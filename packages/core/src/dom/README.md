# DOM mount

The DOM module transforms a user-supplied container into the structure the
Snapdeck engine needs, and provides a teardown that fully reverses the
mutation.

## What mount does

1. Resolves a selector or element to a real `HTMLElement`.
2. Tags the container, its sections, and their slides with stable class
   names so the stylesheet can address them.
3. Groups the slides of each section under a generated "slides track"
   element, which becomes the single transformable parent for horizontal
   navigation. Sections with zero slides get no track.
4. Builds immutable `Section` and `Slide` descriptors, each with `index`,
   `anchor` (from `data-anchor`, or `null`), `element`, and, for slides,
   `parentSectionIndex`. The first section is marked active at mount time.

No inline styles are written; visuals are handled exclusively via classes.

## Class taxonomy

| Class                 | Applied to                                     |
| --------------------- | ---------------------------------------------- |
| `snapdeck`            | the container                                  |
| `is-initialized`      | the container (after successful mount)         |
| `snapdeck-section`    | each matched section                           |
| `snapdeck-slides`     | the generated slide-track wrapper              |
| `snapdeck-slide`      | each matched slide                             |
| `is-active`           | active section / slide (managed by the engine) |
| `is-visible`          | in-viewport section (managed by the engine)   |
| `is-completely`       | fully-visible section (managed by the engine) |

## Teardown contract

`teardown()` returned by `mountStructure` must:

- remove every class this module added;
- unwrap each slide track, reinserting the slides as direct children of
  their section in the original order;
- leave every other user class, attribute, and child intact;
- be idempotent: a second call is a no-op and never throws.

## Before / after

Input markup:

```html
<div id="app">
  <section data-snapdeck-section data-anchor="home">…</section>
  <section data-snapdeck-section>
    <div data-snapdeck-slide>A</div>
    <div data-snapdeck-slide>B</div>
  </section>
</div>
```

After `mountStructure`:

```html
<div id="app" class="snapdeck is-initialized">
  <section class="snapdeck-section" data-anchor="home">…</section>
  <section class="snapdeck-section">
    <div class="snapdeck-slides">
      <div class="snapdeck-slide" data-snapdeck-slide>A</div>
      <div class="snapdeck-slide" data-snapdeck-slide>B</div>
    </div>
  </section>
</div>
```

After `teardown()` the DOM is byte-equivalent to the input (aside from any
changes the engine made during its lifetime, which it owns).
