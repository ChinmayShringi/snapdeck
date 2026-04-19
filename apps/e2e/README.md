# @snapdeck/e2e

Playwright end-to-end tests for Snapdeck, exercised against the
`examples/basic-vertical` Vite demo.

## Layout

- `playwright.config.ts` — two Chromium projects (desktop 1280x720 and
  mobile 375x667 with `hasTouch: true`). The Vite demo is auto-started
  via the `webServer` hook on port 5173.
- `tests/basic-vertical.spec.ts` — full suite. The top of the file has
  audit notes listing which parts of the `SnapdeckInstance` public API
  (see `packages/core/src/types.ts`) are covered and which are gaps.

## Demo hookability

`examples/basic-vertical/script.ts` assigns the deck instance to
`window.__snapdeck` so Playwright can exercise `api.moveTo(...)`. This
is scoped to the demo only, never to `@snapdeck/core`. Remove those
two lines if you drop this test app.

## Running locally

```bash
pnpm install
pnpm --filter @snapdeck/e2e install-browsers   # chromium only
pnpm --filter @snapdeck/e2e test
```

Playwright's `webServer` config reuses an existing dev server when
`CI` is unset (i.e., locally), so running `pnpm --filter
example-basic-vertical dev` in another shell also works and is faster
for iterative work.

## Running in CI

The `e2e` job in `.github/workflows/ci.yml` runs after `check` passes.
It installs Chromium via `pnpm --filter @snapdeck/e2e install-browsers`
then runs `pnpm --filter @snapdeck/e2e test:ci`, which uses the
`github` reporter for annotated failures. The Playwright HTML report
is uploaded as a build artifact.

## Known limitations

- No horizontal-slide coverage: the demo has no slides, so
  `moveSlideLeft` / `moveSlideRight` are unverified here. A second
  demo would be needed.
- Touch swipe is dispatched as synthetic `PointerEvent`s rather than a
  real pointer gesture (snapdeck listens on pointer events, not touch).
  Reliable in headless Chromium but may diverge from real-device behavior.
- `wheel down advances, wheel up retracts` is quarantined with
  `test.fixme` for now. Synthetic wheel events (both
  `new WheelEvent().dispatchEvent` and CDP `Input.dispatchMouseEvent`
  type `mouseWheel`) reach snapdeck's handler and cause
  `preventDefault()`, but do not trigger navigation under headless
  Chromium in the current setup. Keyboard, touch, and programmatic
  tests already cover the underlying `navigateRelative` code paths, so
  functional coverage is preserved. Revisit when running full-browser
  binaries in CI or when the wheel contract is made more deterministic.
