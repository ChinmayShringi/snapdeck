# Snapdeck MEMORY

Pointers to plugin packages and their ownership.

## Plugins

- `@snapdeck/plugin-progress-bar` — `packages/plugin-progress-bar/` — fixed
  top/bottom reading-progress bar. Updates a `--snapdeck-progress-value`
  custom property from `(activeSectionIndex + 1) / totalSections` via
  `afterLoad`, `afterRender`, `afterRebuild`. Only writes CSS custom
  properties; theming lives in `src/styles.css` (exported as
  `@snapdeck/plugin-progress-bar/css`).
- `@snapdeck/plugin-lazy-media` — `packages/plugin-lazy-media/` — lazy-load
  media (`img`, `video`, `iframe`, `source`) per section. Transfers
  `data-src` -> `src` (and `data-srcset` -> `srcset`, `data-poster` ->
  `poster`) for the active section plus `eagerAdjacent` neighbors on
  install and on every `afterLoad`. Idempotent once consumed; `destroy()`
  only detaches the subscription and leaves hydrated DOM in place.
- `@snapdeck/plugin-observer` — `packages/plugin-observer/` — narrow
  MutationObserver-based auto-refresh. Observes the Snapdeck container with
  `childList: true, subtree: false` and debounces `instance.refresh()`
  (default 100ms) when direct-child nodes matching the section selector are
  added or removed. Container is resolved via
  `state.sections[0].element.parentElement` because `SnapdeckInstance` does
  not expose a container accessor yet. No-op install and no-op destroy when
  `MutationObserver` is missing; consumers should fall back to explicit
  `refresh()` calls. See `packages/plugin-observer/README.md` for the
  tradeoff vs calling `refresh()` yourself.

## Framework wrappers

- `@snapdeck/react` — `packages/react/` — React 18+ bindings. Exposes
  `useSnapdeck(options)` (returns `{ ref, api }`), `useSnapdeckEvent(event,
  handler, deps?)` (ref-backed so latest closure is invoked regardless of
  deps), and `SnapdeckProvider`. Instance is created once per mount;
  option changes must flow through `api.setOption(...)`. StrictMode-safe
  (double-invoke guard via instance ref). SSR-safe — no window access at
  module eval. Consumers on Next.js App Router add `"use client"` themselves.

- `@snapdeck/vue` — `packages/vue/` — Vue 3.4+ Composition API bindings.
  Exposes `useSnapdeck(options)` (returns `{ containerRef, api }`, both
  refs; instance constructed in `onMounted`, destroyed via
  `onScopeDispose`) and `useSnapdeckEvent(event, handler, apiRef?)`.
  The event composable resolves the instance via `provide`/`inject`
  (key: `SNAPDECK_KEY`) by default; pass `apiRef` as the third arg to
  skip provide/inject. Listener lifecycle is bound to the effect scope
  and reacts to the ref flipping to `null`. SSR-safe (no window access
  at setup time; `onMounted` does not fire on the server).
