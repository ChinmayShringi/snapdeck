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

- `@snapdeck/angular` — `packages/angular/` — Angular 18/19/20 bindings.
  Exposes a single standalone `SnapdeckDirective` (selector `[snapdeck]`,
  `exportAs: 'snapdeck'`) with an `[options]` input and `(afterLoad)`,
  `(beforeLeave)`, `(afterRender)` outputs. The core `SnapdeckInstance` is
  accessible via a `readonly api` getter; template consumers use
  `#deck="snapdeck"` + `deck.api?.moveDown()`. SSR-safe: `ngOnInit` short-
  circuits when `isPlatformBrowser(PLATFORM_ID)` is false. Built with tsup
  (not ng-packagr) for monorepo consistency; consumers on Angular CLI
  (webpack/esbuild) consume the flat ESM/CJS/d.ts like any library.

- `@snapdeck/vue` — `packages/vue/` — Vue 3.4+ Composition API bindings.
  Exposes `useSnapdeck(options)` (returns `{ containerRef, api }`, both
  refs; instance constructed in `onMounted`, destroyed via
  `onScopeDispose`) and `useSnapdeckEvent(event, handler, apiRef?)`.
  The event composable resolves the instance via `provide`/`inject`
  (key: `SNAPDECK_KEY`) by default; pass `apiRef` as the third arg to
  skip provide/inject. Listener lifecycle is bound to the effect scope
  and reacts to the ref flipping to `null`. SSR-safe (no window access
  at setup time; `onMounted` does not fire on the server).

## Compatibility shims

- `@snapdeck/v4-compat` — `packages/v4-compat/` — drop-in shim for
  fullpage.js v4 migrators. Default export is a `fullpage('#id', opts)`
  factory returning a V4Api (`moveTo`, `moveSectionUp/Down`,
  `moveSlideLeft/Right`, `setKeyboardScrolling`, `getActiveSection`,
  `destroy('all')`, `reBuild`) and writes `window.fullpage_api`.
  `src/option-map.ts` splits v4 options into snapdeck passthroughs
  (`anchors`, `scrollingSpeed`, `easing`, `loopTop`, `loopBottom`,
  `keyboardScrolling`, `fitToSection`, `lazyLoading`, `recordHistory`,
  `lockAnchors`, `css3`) vs callback keys; unknown keys emit
  `console.warn`; recognized-but-unimplemented v4 keys (`licenseKey`,
  `navigation`, `parallax`, …) are silently accepted. `src/callback-
  bridge.ts` translates v4 positional callback signatures
  (`afterLoad(origin, destination, direction)` etc.) into snapdeck's
  payload-object events by unpacking the payload at call time.
  `setAutoScrolling` / `setAllowScrolling` warn-and-noop because
  snapdeck's transform renderer has no runtime snap toggle. Clean-room
  original code — never imports fullpage.js.
