# Snapdeck MEMORY

Pointers to plugin packages and their ownership.

## Plugins

- `@snapdeck/plugin-progress-bar` — `packages/plugin-progress-bar/` — fixed
  top/bottom reading-progress bar. Updates a `--snapdeck-progress-value`
  custom property from `(activeSectionIndex + 1) / totalSections` via
  `afterLoad`, `afterRender`, `afterRebuild`. Only writes CSS custom
  properties; theming lives in `src/styles.css` (exported as
  `@snapdeck/plugin-progress-bar/css`).

## Framework wrappers

- `@snapdeck/react` — `packages/react/` — React 18+ bindings. Exposes
  `useSnapdeck(options)` (returns `{ ref, api }`), `useSnapdeckEvent(event,
  handler, deps?)` (ref-backed so latest closure is invoked regardless of
  deps), and `SnapdeckProvider`. Instance is created once per mount;
  option changes must flow through `api.setOption(...)`. StrictMode-safe
  (double-invoke guard via instance ref). SSR-safe — no window access at
  module eval. Consumers on Next.js App Router add `"use client"` themselves.
