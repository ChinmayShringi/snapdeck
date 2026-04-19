# Snapdeck MEMORY

Pointers to plugin packages and their ownership.

## Plugins

- `@snapdeck/plugin-progress-bar` — `packages/plugin-progress-bar/` — fixed
  top/bottom reading-progress bar. Updates a `--snapdeck-progress-value`
  custom property from `(activeSectionIndex + 1) / totalSections` via
  `afterLoad`, `afterRender`, `afterRebuild`. Only writes CSS custom
  properties; theming lives in `src/styles.css` (exported as
  `@snapdeck/plugin-progress-bar/css`).
