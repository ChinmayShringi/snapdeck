# Rebuild 01 - Consolidated Weak Spots Catalogue

Every `> WEAK SPOT:` flag from the architecture, API, build, and wrapper docs, gathered in one place, grouped by theme, with severity and rebuild implication.

Severity key:
- **H (High)**: fundamental architectural constraint; will shape the rebuild.
- **M (Medium)**: bug risk or performance hit; worth fixing deliberately.
- **L (Low)**: code smell or cosmetic; fix if convenient.

---

## 1. Globals and singletons (H)

| # | Issue | Source | Impact |
|---|---|---|---|
| 1 | `FP` object as global singleton mutated from ~20 files | `common/constants.js` + many | Untraceable coupling. Cannot isolate or test. |
| 2 | `window.state` exposed unconditionally | `common/state.js` | Test hatch leaks into production. |
| 3 | `window.fp_utils`, `window.fp_easings` | various | Global namespace pollution. |
| 4 | `window.fullpage_api` as the handle | `fullpage.js` | Single-instance restriction; awkward for module bundlers. |
| 5 | Single-instance restriction in library | entire codebase | Cannot mount two fullpage instances on one document. |
| 6 | `FP.moveTo` assigned in two different files | `scroll/moveTo.js`, `scroll/scrollPage.js` | Obscures public API ownership. |
| 7 | `FP.destroy` / `FP.reBuild` set from `instance.js` and `resize.js` respectively | scattered | Public API is not defined in one place. |

**Rebuild:** one instance class; instance methods on a returned handle; no globals except an optional compatibility layer.

---

## 2. State management (H)

| # | Issue | Source | Impact |
|---|---|---|---|
| 8 | Mutable state from anywhere with no contract | `common/state.js` | Impossible to reason about who writes what. |
| 9 | Two access patterns (`getState()` vs direct `state.xxx` import) | many | Inconsistency. |
| 10 | `state.scrollTrigger` as shared mutable field | many | Programmatic moves inherit stale `trigger` from the last gesture. |
| 11 | `state.previousDestTop` serves double duty | `scroll/scrollPage.js` | Direction inference races on rapid sequential moves. |
| 12 | `activeAnimation` flag controls external cancellation | `common/scrollTo.js` | Non-obvious control flow. |
| 13 | `canScroll` manipulated from many places with timing-dependent ordering | scattered | Race conditions when queuing moves. |

**Rebuild:** typed state + single dispatch entry point (reducer) or class-encapsulated private state; event emission on state change for derived features.

---

## 3. Event system (M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 14 | EventEmitter has no error isolation | `common/eventEmitter.js` | One broken listener breaks everything downstream. |
| 15 | EventEmitter listeners accumulate across destroy/reinit | `common/eventEmitter.js` | Memory leak pattern in SPAs. |
| 16 | Order of `bindEvents` subscribers depends on import order | `fullpage.js` | Changing an import can silently change behaviour. |
| 17 | `EventEmitter` has no introspection | `common/eventEmitter.js` | Debugging "my callback doesn't fire" is grep-only. |
| 18 | "import for side effects" is the coupling mechanism | many | Tree-shaking impossible; hidden dependencies. |

**Rebuild:** use native `EventTarget` for user-facing events; internal plugin system with explicit lifecycle methods; no side-effect imports.

---

## 4. Input handling (M / H)

| # | Issue | Source | Impact |
|---|---|---|---|
| 19 | Wheel handler allocates slice arrays on every event | `mouse/wheel.js`, `common/utils.js getAverage` | Significant on high-frequency trackpads. |
| 20 | 150-entry ring with `.shift()` and `.slice()` per event | `mouse/wheel.js` | O(n) operations per frame. |
| 21 | Magic number 700 (`isFastSpeed` threshold) not configurable | `scroll/scrollPage.js` | Users can't tune wheel behaviour. |
| 22 | `isFastSpeed` double-setTimeout hack | `scroll/scrollPage.js` | Complicated timing coordination. |
| 23 | Three wheel-event name branches (`wheel`/`mousewheel`/`DOMMouseScroll`) | `mouse/wheel.js` | Dead code for modern browsers. |
| 24 | `attachEvent` IE<9 fallback still present | various | Dead code. |
| 25 | `oncePerScroll` shared `prevWheelTime` across triggers | `common/tick.js` | `beforeLeave` can be suppressed incorrectly in mixed-source sequences. |
| 26 | Mid-animation input cancellation not supported | scroll engine | User reverses mid-scroll, animation completes unwanted direction. |
| 27 | Touch handler re-bound on every call | `touch.js` | Defensive but suggests binding lifecycle is unclear. |
| 28 | Middle-mouse-button drag hijacks browser's auto-scroll | `mouse/wheel.js`, `mouse/move.js` | Unusual; questionable whether to include. |

**Rebuild:** debounce wheel events rather than heuristic acceleration; Element.animate() + proper cancel; single event name (`wheel`); drop middle-button feature or document it clearly.

---

## 5. DOM transformation (H)

| # | Issue | Source | Impact |
|---|---|---|---|
| 29 | Inline pixel heights on every section, every resize | `prepareDom.js`, `resize.js` | Fights external CSS; many write operations. |
| 30 | `-webkit-`, `-moz-`, `-ms-` transform prefixes | `common/utilsFP.js` | Dead prefixes in modern browsers. |
| 31 | 10ms setTimeout to remove `.fp-notransition` | `common/transformContainer.js` | RAF would be more reliable; better still, don't toggle. |
| 32 | setTimeout-based animation-end coordination (not `transitionend`) | `scroll/scrollPage.js` | Can fire while animation still in progress after interruption. |
| 33 | "Restore inline styles" via `data-fp-styles` | `dom/prepareDom.js`, `destroyStructure.js` | User-applied inline styles between init and destroy are lost. |
| 34 | Ancestor-chain style mutation (`getParentsUntil(body)`) | `prepareDom.js` | Aggressive; doesn't track original ancestor styles. |
| 35 | Modifying `html` and `body` overflow/height inline | `autoScrolling.js` | Conflicts with user's global styles. |
| 36 | `win.scrollTo(0, 0)` forced reset on destroy | `dom/destroyStructure.js` | Visible page jump, no opt-out. |
| 37 | `MutationObserver` config too broad (subtree + childList + characterData) | `dynamic.js` | Every text change fires the handler. |
| 38 | `styleSlides` idempotency unclear on re-call | `slides/styleSlides.js` | Risk of double-wrapping. |
| 39 | `options.anchors = []` reset on every content change | `dynamic.js` | User-supplied anchors lost. |
| 40 | Silent failure on non-matching direct children | `sections.js` | User error hard to diagnose. |
| 41 | `updateStructuralState()` allocates fresh Item objects on every call | `stateUpdates.js` | Wasteful during init, dynamic updates, reBuild. |
| 42 | Two Item class shapes (`Item/Section` vs `SectionPanel/SlidePanel`) | `common/item.js`, `stateUpdates.js` | Unnecessary duplication. |

**Rebuild:** CSS variables for dimensions; `grid-template-rows: repeat(N, 100dvh)` + `scroll-snap`; no inline styles for layout; single Section type; explicit `observer()` rather than MutationObserver autodetection.

---

## 6. Scroll engine (M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 43 | Two movement modes (CSS3 vs JS tween) double the engine code | scroll files | Fragility; two paths for two configurations. |
| 44 | `fp_easings` as global bag of easing functions | `common/scrollTo.js`, `easing.js` | User must attach custom easing to global. |
| 45 | Animation end detection via setTimeout, not `transitionend` | `scroll/scrollPage.js` | Unreliable after resize mid-animation. |
| 46 | No "did the movement complete correctly?" check | `scroll/scrollPage.js` | Stale `v` bundle can be processed. |
| 47 | `fitToSection` equality check not tolerant to sub-pixel layout | `scroll/scrollHandler.js` | Rare persistent "never fits" loops. |
| 48 | `onLeave` fires on every programmatic move (no "only on user gesture" variant) | scroll engine | Users can't distinguish intent. |
| 49 | Two Item class shapes mean callbacks get fresh Section objects on every fire | `callbacks/nullOrSection.js` | Allocation pressure on rapid events. |

**Rebuild:** single path using `Element.animate()`; `transitionend`/`finished` awaited for completion; single Section type; user-gesture flag in payload.

---

## 7. Sizing and responsive (M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 50 | Responsive mode uses `innerWidth`/`innerHeight` directly, not `matchMedia` | `responsive.js` | Every resize event evaluates; no native breakpoint caching. |
| 51 | Setter typo bug: `setFitToSection(originals.autoScrolling, ...)` | `responsive.js` | `fitToSection` is restored from the wrong saved value on responsive exit. |
| 52 | Four staggered resize timers (0, 200, 400, 600ms) on touch | `resize.js` | Wasted work in the common case. |
| 53 | `getWindowHeight` uses `innerHeight` which flips with mobile URL bar | `common/utils.js` | Multiple re-layouts during URL bar animation. |

**Rebuild:** `matchMedia` for breakpoints; `100dvh` via CSS variable for heights; single-retry resize with visibility check.

---

## 8. Callbacks (M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 54 | Double-dispatch (CustomEvent + option function) | `callbacks/fireCallback.js` | Wasteful; unclear which is canonical. |
| 55 | Inconsistent `this` binding in user callbacks | `callbacks/fireCallback.js` | Confusing; undocumented. |
| 56 | `beforeLeave` debounce uses single shared `prevWheelTime` | `common/tick.js` | Can suppress legitimate calls across trigger sources. |
| 57 | `trigger` field on state is stale for programmatic moves | many | Callbacks receive wrong `trigger` for programmatic calls. |
| 58 | Cancellation not atomic: `beforeLeave` side effects not rolled back if `onLeave` cancels | scroll engine | Invariants can be broken. |

**Rebuild:** native `EventTarget` API; `event.preventDefault()` for cancellation; `trigger` always in payload; `this` always the fullpage instance.

---

## 9. Build and distribution (L / M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 59 | Jquery adapter always included in v4 bundle | `jquery-adaptor.js` | Dead weight for non-jQuery users. |
| 60 | IE11 polyfills in every build (~10KB) | `polyfills/` | Dead weight in 2026. |
| 61 | Babel runtime helpers in every build (~6KB min) | Babel config | Unnecessary for ES2020+ targets. |
| 62 | No ESM output, only UMD | `rollup.config.js` | No tree-shaking, no subpath exports. |
| 63 | Hand-maintained 150-entry reserved list for Terser | `rollup.config.js` | Silent breakage risk on new properties. |
| 64 | `drop_console: true` removes production error logs | `rollup.config.js` | Production errors invisible. |
| 65 | No JS sourcemap in dist | build output | Production debugging painful. |
| 66 | `dist/` committed to git | repo | Large diff noise on every version bump. |
| 67 | `package.json` has no `module`, `types`, or `exports` field | `package.json` | Modern bundlers can't optimally consume. |
| 68 | Empty `mixed/index.min.js` stub | file | Dead space. |
| 69 | Gulp + Rollup hybrid toolchain | `gulpfile.js`, `rollup.config.js` | Duplicated work; extra deps. |
| 70 | `dev` watch excludes CSS | `package.json` scripts | User must manually rebuild on CSS change. |
| 71 | Missing gulp tasks referenced in scripts (`getDistFiles`, `moveExtensions`) | `gulpfile.js` | Public repo can't reproduce the extensions build. |

**Rebuild:** single modern toolchain (Vite or tsup); ESM-first; strongly-typed `exports` field; sourcemaps always; no property mangling.

---

## 10. Licensing/watermarking (L)

| # | Issue | Source | Impact |
|---|---|---|---|
| 72 | Obfuscated domain check in `console.js` | `console.js` | Not a security mechanism; trips linters. |
| 73 | Watermark banner injection via `mixed/warnings.js` | `mixed/warnings.js` | Licensing enforcement in user-facing code. |

**Rebuild:** if GPL-only, drop watermarks entirely. If commercial, move enforcement to a separate build or to runtime checks that don't pollute the DOM.

---

## 11. Testing (M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 74 | No unit tests at module level | `tests/unit/` | Can't regression-test utility functions. |
| 75 | JSDOM limitations (no real layout, no transitions) | test infrastructure | Layout bugs missed. |
| 76 | `test` namespace leaks into production `fullpage_api` | various | Test-only properties in public surface. |
| 77 | Extensions untested (in public repo) | test suite | Only commercial testing covers extensions. |
| 78 | No visible CI | repo | Manual testing risk. |

**Rebuild:** unit + integration + E2E test tiers; Playwright for real-browser tests; CI on every push; coverage target 85%.

---

## 12. Wrappers (M)

| # | Issue | Source | Impact |
|---|---|---|---|
| 79 | All wrappers default to extensions bundle | react, vue, angular | Extra ~10 KB for users not needing extensions. |
| 80 | All wrappers inherit single-instance limit | all | Can't mount two fullpages per page in any framework. |
| 81 | React wrapper uses hard-coded `#fullpage` ID | react | Conflicts in multi-instance hypothetical. |
| 82 | React wrapper re-renders via destroy+reinit on any tracked prop | react | Wasteful; no partial-update path. |
| 83 | React wrapper `propertiesThatNeedReRender` list is hand-maintained | react | Silent drops of un-listed prop changes. |
| 84 | Vue wrapper deep-watches entire options object | vue | Any nested change rebuilds fullpage. |
| 85 | Vue wrapper callback list is incomplete (missing `beforeLeave` etc.) | vue | Users can't use Vue events for these. |
| 86 | Angular `AnchorLinkDirective` selector `[href]` is global | angular | Hijacks all hash links in the app. |
| 87 | Angular wrapper relies on `fullpage` global from `angular.json scripts` | angular | Not standard ES imports. |
| 88 | Angular wrapper has no `@Output` for callbacks | angular | No idiomatic Angular event binding. |
| 89 | Angular wrapper `console.log` in production | `fullpage.directive.ts` | Development artefact. |
| 90 | All three wrappers produce SSR hydration mismatches | react, vue, angular | No SSR-safe rendering mode. |

**Rebuild:** instance-per-component; no globals; standard imports; full `@Output`/event coverage; SSR-aware skeleton rendering.

---

## 13. TypeScript and public API contract (L)

| # | Issue | Source | Impact |
|---|---|---|---|
| 91 | `types/index.d.ts` is hand-maintained | repo root | Can drift from source. |
| 92 | Extension option types use `any` (e.g. `dropEffectOptions`) | types | Incomplete surface. |
| 93 | `FP.render` is at runtime but not in types | runtime vs types | Undocumented feature. |
| 94 | "Can I change this option at runtime?" is undocumented | scattered | Users must read source. |

**Rebuild:** types generated from TypeScript source; no `any` in option shapes; full documentation of setters.

---

## 14. Odd specifics (L)

| # | Issue | Source | Impact |
|---|---|---|---|
| 95 | `FP.landscapeScroll` exposed on public API though it's an internal function | `slides/landscapeScroll.js` | Surface bloat. |
| 96 | Section indexing is 1-based but slide indexing is 0-based | `moveTo`/`getSectionByAnchor` | Confusing contract. |
| 97 | `getFullpageData()` returns live options reference | `fullpage.js setAPI()` | Mutation is an undocumented side channel. |
| 98 | `win.scrollTo` and other `win`/`doc` aliases | `common/constants.js` | Marginally useful; mostly style. |
| 99 | `data-fp-styles` destroys user inline style mutations between init and destroy | `destroyStructure.js` | Subtle data loss. |
| 100 | CSS writes no CSS variables, uses table-cell for centering | `src/css/fullpage.css` | Dated pattern; hard to customise. |

---

## Summary counts

- **High severity**: 15 items (globals, state, input perf, inline styles).
- **Medium severity**: 50 items (callbacks, DOM, build, wrappers).
- **Low severity**: 35 items (cosmetic, types, small dead code).

The rebuild priorities (in `rebuild/02-rebuild-recommendations.md`) address the 15 high-severity items first; many of the 50 medium items fall out of the high-severity fixes.
