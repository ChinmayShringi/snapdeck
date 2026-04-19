# Rebuild 02 - Rebuild Recommendations

This document translates the 100 weak spots catalogued in `01-weak-spots-catalogue.md` into a concrete architectural proposal for a rebuild. It is opinionated where it can be, and names libraries and web platform APIs where substitutions are obvious.

The target: a rewrite that delivers the same user-visible behaviour as fullpage.js 4.0.41 on evergreen browsers (Chrome, Firefox, Safari, Edge from the last 3 years), in less code, with fewer bugs, without the GPL/commercial distinction muddying the architecture.

Out of scope: matching every commercial extension feature-for-feature. The commercial extensions can be rebuilt as separate plugin packages once the core is solid.

---

## Section 1 - Target platform

**Drop:**
- IE11 and earlier (deletes the entire `polyfills/` folder, ~400 lines).
- `attachEvent`, vendor-prefixed transforms, `MSPointer*`, the `DOMMouseScroll` / `mousewheel` branches.
- The jQuery adapter.
- Inline styles as the primary layout mechanism.
- The custom `utils.js` DOM helpers (585 lines) in favour of native APIs.

**Assume:**
- ESM everywhere. No UMD builds by default; ESM with a CommonJS compatibility build as a secondary output.
- `WeakRef` / `FinalizationRegistry` if useful (not required).
- `ResizeObserver`, `IntersectionObserver`, `MutationObserver` with narrow filters.
- `Element.animate()` (Web Animations API).
- `matchMedia` with `addEventListener('change')` for responsive breakpoints.
- `scroll-snap-type: y mandatory` and `100dvh` in CSS for cooperative layout.
- `pointermove` / `pointerdown` / `pointerup` unified pointer events.

**Language:** TypeScript source, emit ESM `.js` + `.d.ts` from a single pipeline.

---

## Section 2 - Proposed module tree

```
src/
  core/
    Fullpage.ts            # main class
    state.ts               # typed state + dispatch
    events.ts              # instance-scoped event bus
    options.ts             # option types + defaults + merge
    types.ts               # Section, Slide, Item, trigger etc.

  dom/
    mount.ts               # prepareDom equivalent, returns a Teardown fn
    sections.ts            # Section + Slide factories
    measure.ts             # observe sizes via ResizeObserver
    styles.ts              # CSS variable updates (no inline pixel writes)

  scroll/
    engine.ts              # Element.animate wrapper; single movement path
    navigate.ts            # moveTo / moveUp / moveDown public commands
    cancel.ts              # mid-flight cancellation support

  input/
    wheel.ts               # wheel with time-debounced gesture detection
    touch.ts               # pointer events
    keyboard.ts            # keydown handler + focus trap
    anchors.ts             # hashchange + in-page link handling

  ui/
    nav.ts                 # vertical dot nav (optional, built as plugin)
    slideNav.ts            # horizontal dot nav (optional)
    arrows.ts              # slide arrows (optional)

  plugins/
    api.ts                 # Plugin interface
    lazyLoad.ts            # built-in plugin
    media.ts               # built-in plugin (play/pause)
    observer.ts            # built-in plugin (MutationObserver for dynamic content)
    scrollOverflow.ts      # built-in plugin (no external @fullpage/scrolloverflow dep)

  index.ts                 # public API: default export + named types
```

Roughly 2,500-3,000 lines of TypeScript expected, versus ~7,000 of the current JS.

---

## Section 3 - The `Fullpage` class shape

```ts
interface FullpageInstance {
    // Inspection
    readonly state: Readonly<FullpageState>;
    readonly activeSection: Section | null;
    readonly activeSlide: Slide | null;

    // Commands (all return Promise for await-able completion)
    moveTo(target: AnchorOrIndex, slide?: AnchorOrIndex): Promise<void>;
    moveUp(): Promise<void>;
    moveDown(): Promise<void>;
    moveSlideLeft(): Promise<void>;
    moveSlideRight(): Promise<void>;
    silentMoveTo(target: AnchorOrIndex, slide?: AnchorOrIndex): void;

    // Subscribe
    on<K extends keyof Events>(event: K, handler: Events[K]): () => void;

    // Runtime config
    setOption<K extends RuntimeOptionKey>(key: K, value: Options[K]): void;
    getOption<K extends keyof Options>(key: K): Options[K];

    // Dynamic content
    refresh(): void;  // explicit, replaces `render()`

    // Teardown
    destroy(): void;
}

export default function fullpage(
    container: string | HTMLElement,
    options?: Partial<Options>
): FullpageInstance;
```

Key differences from v4:

- **Instance-returned, not global.** The instance is returned; no `window.fullpage_api` assignment. A compatibility shim can be provided as an opt-in side-effect import.
- **Commands are async.** Returning `Promise<void>` lets callers `await fp.moveTo(3)` and know the animation has finished. Resolves when the movement animation completes; rejects on cancellation.
- **`on()` returns an unsubscribe function.** Standard pattern; avoids the `off()` + remembering handler reference footgun.
- **Options setter is type-safe.** `RuntimeOptionKey` is a union of the options that are actually changeable at runtime.
- **Multi-instance works.** Two calls to `fullpage()` on different containers produce independent instances.

---

## Section 4 - State management

Replace the global `state` object with:

```ts
// src/core/state.ts
export interface FullpageState {
    readonly sections: ReadonlyArray<Section>;
    readonly slides: ReadonlyArray<Slide>;
    readonly activeSection: Section | null;
    readonly isAnimating: boolean;
    readonly canScroll: boolean;
    readonly isResponsive: boolean;
    readonly windowHeight: number;
    readonly scrollY: number;
    readonly scrollX: number;
    // ... etc
}

type Action =
    | { type: 'navigate/start'; origin: Section; destination: Section; trigger: Trigger }
    | { type: 'navigate/end'; destination: Section }
    | { type: 'resize'; height: number; width: number }
    | { type: 'structure/updated'; sections: Section[]; slides: Slide[] }
    | { type: 'responsive/changed'; isResponsive: boolean }
    | ...;

export class Store {
    private s: FullpageState;
    private listeners = new Set<(state: FullpageState) => void>();

    getState(): Readonly<FullpageState> { return this.s; }

    dispatch(action: Action): void {
        const next = reduce(this.s, action);
        if (next !== this.s) {
            this.s = next;
            this.listeners.forEach(l => l(next));
        }
    }

    subscribe(fn: (state: FullpageState) => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
}
```

Why:
- Every state change goes through `dispatch(action)`, so grepping `dispatch` tells you every possible mutation.
- State is passed around as a readonly value. Modules that need to react to state changes subscribe.
- No `window.state`.
- The store is instance-scoped, created in the `Fullpage` constructor, never accessible from outside.

Cost: a small reducer file and an `Action` type union. For a team project this is a clear win.

---

## Section 5 - Event bus

Instance-scoped, error-isolating, typed:

```ts
// src/core/events.ts
export interface Events {
    beforeLeave: (payload: NavigationPayload) => boolean | void;
    onLeave:     (payload: NavigationPayload) => boolean | void;
    afterLoad:   (payload: NavigationPayload) => void;
    afterRender: (payload: { activeSection: Section }) => void;
    afterResize: (payload: { width: number; height: number }) => void;
    afterSlideLoad: (payload: SlideNavigationPayload) => void;
    onSlideLeave:   (payload: SlideNavigationPayload) => boolean | void;
    afterResponsive: (isResponsive: boolean) => void;
    afterReBuild: () => void;
    onScrollOverflow: (payload: OverflowPayload) => void;

    // Internal events (not in public surface)
    'internal/bindEvents': () => void;
    'internal/destroy':    () => void;
}

export class EventBus {
    private map: { [K in keyof Events]?: Set<Events[K]> } = {};

    on<K extends keyof Events>(event: K, handler: Events[K]): () => void {
        if (!this.map[event]) this.map[event] = new Set() as any;
        (this.map[event] as Set<any>).add(handler);
        return () => (this.map[event] as Set<any>).delete(handler);
    }

    emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean {
        const handlers = this.map[event];
        if (!handlers) return true;
        let result = true;
        for (const handler of handlers) {
            try {
                const r = (handler as any)(...args);
                if (r === false) result = false;
            } catch (err) {
                console.error(`[fullpage] handler for "${String(event)}" threw:`, err);
            }
        }
        return result;
    }
}
```

Why:
- Typed. `on('afterLoad', payload => payload.destination)` gets full IntelliSense.
- Error-isolated. A broken user handler logs and moves on; it does not halt the library.
- Instance-scoped. No cross-instance interference.
- Cancellation via returning `false` from a `beforeLeave`/`onLeave`/`onSlideLeave` handler; `emit` returns `false` if any handler returned `false`.
- `once()` is a one-liner on top of `on()`; not included above for brevity.

Deprecation: keep the "callback as option" style (`new Fullpage(el, { afterLoad: fn })`) as a shim that registers an `on('afterLoad', fn)` subscriber, for migration ease.

---

## Section 6 - The scroll engine

Replace the dual CSS3 + JS-tween paths with a single Web Animations API call:

```ts
// src/scroll/engine.ts
export interface ScrollAnimation {
    promise: Promise<void>;
    cancel(): void;
}

export function animateContainer(
    container: HTMLElement,
    toY: number,
    duration: number,
    easing: string
): ScrollAnimation {
    const current = getCurrentTranslateY(container);

    const animation = container.animate(
        [
            { transform: `translate3d(0, ${current}px, 0)` },
            { transform: `translate3d(0, ${toY}px, 0)` }
        ],
        { duration, easing, fill: 'forwards' }
    );

    return {
        promise: animation.finished.then(() => {
            animation.commitStyles();
            animation.cancel();  // so subsequent animations start fresh
        }),
        cancel: () => animation.cancel()
    };
}
```

Why:
- One code path. Scrollbar mode (real scroll) becomes a separate function that uses `window.scrollTo({ top, behavior: 'smooth' })` with a poll on `scrollY`, or the Web Animations API on `scrollTop` via a ResizeObserver trick.
- Cancellation is native and instant.
- Completion is a Promise.
- Easing is any valid CSS `<easing-function>` (including `cubic-bezier(...)` directly; no global `fp_easings` lookup).
- No `transitionend` vs `setTimeout` dilemma; `animation.finished` is the canonical completion signal.

The user-facing `scrollingSpeed` and `easing` options map directly to the `duration` and `easing` of `Element.animate()`.

The "fast speed" hack (magic number 700) goes away. If the user wants 200ms animations, they get 200ms animations. Concurrent input is handled by the command queue (see section 9).

---

## Section 7 - CSS layout strategy

Drop 95% of inline styles. The CSS handles sizing via CSS variables set on the container:

```css
.fullpage-wrapper {
    --fp-section-height: 100dvh;
    --fp-section-count: 1;
    --fp-section-current: 0;

    height: var(--fp-section-height);
    overflow: hidden;
    touch-action: none;
    position: relative;
}

.fullpage-wrapper > .fp-section {
    height: var(--fp-section-height);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;  /* replaces fp-tableCell */
}

.fullpage-wrapper > .fp-section > .fp-slides {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    width: 100%;
    height: 100%;
}
```

The JS only needs to:
- Update `--fp-section-height` on resize if you're not using `100dvh` (which already handles mobile toolbar intrusion).
- Set `transform` on the wrapper during animation (ephemeral, via `Element.animate`, so no inline style either once the animation completes and is cancelled).
- Toggle `.fp-section--active`, `.fp-section--completely`, `.fp-section--visible` classes.

Nothing else writes to `.style`. `destroyStructure()` shrinks to "remove our classes, unmount any inserted DOM nodes, stop animations", no inline-style diffing.

Responsive mode becomes a media query in CSS, not a JS branch:

```css
@media (max-width: 768px) {
    .fullpage-wrapper {
        touch-action: auto;
        height: auto;
        --fp-section-height: auto;
    }
    .fullpage-wrapper > .fp-section {
        height: auto;
    }
}
```

The JS still fires the `afterResponsive` event via `matchMedia.addEventListener('change')`, but it no longer has to manipulate html/body overflow.

---

## Section 8 - Input handling

### Wheel

Drop the 150-entry acceleration heuristic. Replace with a time-based debounce:

```ts
const MIN_GAP_MS = 200;
let lastWheelTime = 0;

element.addEventListener('wheel', (e) => {
    if (isInsideScrollableOverflow(e.target)) return;
    e.preventDefault();

    const now = performance.now();
    if (store.getState().isAnimating) return;
    if (now - lastWheelTime < MIN_GAP_MS) return;
    lastWheelTime = now;

    const direction = e.deltaY > 0 ? 'down' : 'up';
    engine.navigate(direction);
}, { passive: false });
```

The 200ms gap stops rapid-fire trackpad events from firing multiple navigations. No array allocations, no slice averaging, no `Math.ceil` on each event.

If users complain that 200ms is too fast/slow, expose `wheelDebounce` as an option. Do not re-introduce the acceleration heuristic unless measurement proves it's needed.

### Touch

Unify under Pointer Events:

```ts
element.addEventListener('pointerdown', onDown);
element.addEventListener('pointermove', onMove);
element.addEventListener('pointerup', onUp);
element.addEventListener('pointercancel', onUp);
```

One handler path for mouse, touch, stylus. The `pointerType` field distinguishes if needed. No `isReallyTouch()` IE-quirk filter.

### Keyboard

Same pattern as now, but:
- Focus trap via the `focus-trap` npm package or a re-implementation that uses the current `inert` attribute proposal as it lands.
- `queueMicrotask` instead of `setTimeout(fn, 0)`.

---

## Section 9 - Command queue and cancellation

Mid-flight cancellation is the missing feature users hit most.

```ts
class CommandQueue {
    private current: ScrollAnimation | null = null;

    async run(command: () => ScrollAnimation): Promise<void> {
        if (this.current) this.current.cancel();
        this.current = command();
        try {
            await this.current.promise;
        } finally {
            this.current = null;
        }
    }
}
```

Any `moveTo()` / `moveUp()` / `moveDown()` call goes through the queue. Calling `moveTo(3)` mid-animation cancels the current animation and starts the new one from the interrupted position. The in-flight Promise rejects (caller can `try/catch`).

This eliminates:
- The `canScroll` flag and its races.
- The `isFastSpeed` dual-timer hack.
- The mid-animation input ignore behaviour that current users find frustrating.

---

## Section 10 - Dynamic content

Keep `MutationObserver` but narrow the config:

```ts
const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some(m =>
        m.type === 'childList' && (
            anyAdded(m.addedNodes, sectionSelector) ||
            anyRemoved(m.removedNodes, sectionSelector)
        )
    );
    if (relevant) scheduleRefresh();
});
observer.observe(wrapper, {
    childList: true,
    subtree: false  // only direct children
});
```

No `characterData: true`, no `subtree: true`. Text changes and nested DOM churn below the section level don't fire the observer.

For applications that mutate deeply, expose an explicit `fp.refresh()` (replaces `FP.render`) that the app can call after batch updates.

---

## Section 11 - Plugin model

Plugins are first-class and composable:

```ts
export interface Plugin {
    readonly name: string;
    install(fp: FullpageInstance): void;
    destroy(): void;
}

// Usage:
import fullpage from '@fullpage/core';
import parallax from '@fullpage/plugin-parallax';
import cards from '@fullpage/plugin-cards';

const fp = fullpage('#fullpage', {
    plugins: [
        parallax({ percentage: 62, property: 'translate' }),
        cards({ perspective: 100 })
    ],
    // core options
});
```

Each plugin is its own npm package. Tree-shakable. Licence keys are validated by each plugin on construction (commercial plugins have their own validation logic).

Plugins receive the instance and register hooks via `fp.on('afterLoad', ...)`. No import-side-effects, no magic EventEmitter registrations.

The 13 commercial extensions become 13 plugin packages. The free bundle becomes `@fullpage/core` + 4 built-in plugins (observer, lazyLoad, media, scrollOverflow).

---

## Section 12 - Build pipeline

Replace Rollup+Gulp hybrid with Vite (or Rollup-only):

```
package.json:
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  }
```

Outputs:
- `dist/fullpage.js` - ESM build.
- `dist/fullpage.cjs` - CJS build.
- `dist/fullpage.d.ts` - types.
- `dist/fullpage.css` - stylesheet (also injected as a side-effect import if you prefer JS-bundled CSS).
- No separate "extensions" bundle. Each plugin ships from its own package.
- No jQuery adapter.
- No IE11 polyfills.

Target: ESMA2022 (native class fields, `??`, `?.`, private class members). Babel not required.

Expected minified size: 15-20 KB (down from 58.8 KB). Extensions each 2-5 KB, loaded only if imported.

---

## Section 13 - Testing

Replace UI integration test suite with layered unit tests:

```
tests/
  unit/
    state.test.ts           # reducer tests
    events.test.ts          # EventBus error isolation + typing
    engine.test.ts          # animation engine with fake timers
    wheel.test.ts           # debounce
    touch.test.ts           # pointer event handling
    options.test.ts         # merge + validation

  integration/
    init.test.ts            # full mount + teardown
    moveTo.test.ts          # navigation end-to-end
    responsive.test.ts      # breakpoint changes

  e2e/                      # Playwright, optional
    desktop.spec.ts
    mobile.spec.ts
```

Vitest for unit + integration (fast, ESM-native). Playwright for e2e.

Every reducer action gets a test. Every exposed method gets a test. Every plugin gets a test.

---

## Section 14 - Framework wrappers

### React

Functional component, hooks-based, one wrapper per concern:

```tsx
import { useFullpage } from '@fullpage/react';

function App() {
    const { ref, api } = useFullpage({
        scrollingSpeed: 700,
        plugins: [parallax()]
    });

    useFullpageEvent('afterLoad', ({ destination }) => {
        console.log('On section', destination.anchor);
    });

    return (
        <div ref={ref}>
            <section className="fp-section">...</section>
            <section className="fp-section">...</section>
        </div>
    );
}
```

Why:
- No class component with 17 methods.
- No destroy/init-on-prop-change (React state updates don't tear down the fullpage instance; `api.setOption` handles the runtime-changeable ones).
- Event subscription is a hook that auto-unsubscribes on unmount.
- Works in React 18+ StrictMode (double-mount safe).

### Vue

Composable:

```vue
<script setup>
import { useFullpage } from '@fullpage/vue';

const { containerRef, api } = useFullpage({
    scrollingSpeed: 700
});

useFullpageEvent('afterLoad', ({ destination }) => { ... });
</script>

<template>
    <div ref="containerRef">
        <section class="fp-section">...</section>
    </div>
</template>
```

Composable instead of Options API. Auto-unsubscribes via `onScopeDispose`.

### Angular

Standalone directive:

```ts
@Component({
    standalone: true,
    imports: [FullpageDirective],
    template: `
        <div fullpage [options]="options" (afterLoad)="onAfterLoad($event)">
            <section class="fp-section">...</section>
        </div>
    `
})
```

`(afterLoad)` becomes a real `@Output` EventEmitter (not a callback via options). Works with signals.

All three wrappers import from `@fullpage/core`, the bundle is the same, no `fullpage.extensions.min` hardcoded import. Each wrapper is less than 100 lines of code.

---

## Section 15 - Migration path for existing users

Ship a v5-compat layer as a separate package `@fullpage/v4-compat`:

```js
// User's existing v4 code:
import fullpage from '@fullpage/v4-compat';

new fullpage('#fullpage', {
    anchors: ['a', 'b'],
    afterLoad(origin, destination, direction, trigger) { ... }
});
```

The compat layer:
- Exposes a constructor-style factory (matches v4 `new fullpage()` / jQuery's `$.fullpage()`).
- Accepts callbacks as options and shims them to `on()`.
- Writes `window.fullpage_api` on init for code that reads it.
- Provides a `destroy('all')` that matches v4 behaviour.

For users who want the full rewrite benefits, `@fullpage/core` is the new home.

---

## Section 16 - Phased rollout

Week 0-1: foundations. `Fullpage` class skeleton, `Store`, `EventBus`, `options.ts`, TypeScript project setup, CI.

Week 2: layout. CSS file with variables, mount/unmount DOM manipulation, no movement yet. A static page of sections with `.fp-section--active` class switching.

Week 3: scroll engine. `animateContainer`, command queue, cancellation. At the end, `fp.moveTo(n)` animates; `fp.destroy()` cleans up.

Week 4: input. Wheel, pointer, keyboard. By the end, native user gestures move the deck.

Week 5: UI. Nav bullets, slide arrows, watermark (opt-in). By the end, feature parity with basic free fullpage usage.

Week 6: built-in plugins. observer, lazyLoad, media, scrollOverflow.

Week 7: framework wrappers.

Week 8: compat layer + migration docs.

Week 9-10: commercial plugins (parallax first; the highest-demand paid extension).

By week 10 a credible replacement exists. Weeks 11+ are polish, benchmarks, docs, and remaining plugins.

---

## Section 17 - What NOT to do

- **Do not port the existing source "cleaned up".** Every weak spot in the catalogue has roots in the architecture; incremental cleanup hits a ceiling. Rewrite from scratch against a clean design, use the existing source as a behavioural reference only.

- **Do not support IE11, jQuery, or the "CSS3 disabled" mode.** These cover less than 0.5% of users in 2026 and account for a disproportionate share of code complexity.

- **Do not replicate the licensing/watermark system inside the core.** If you want to charge for plugins, do it per plugin; do not bundle the watermark into the free core.

- **Do not expose state or helpers on `window`.** Every global is a future migration headache.

- **Do not ship two bundles (free + extensions).** Ship one core, then plugin packages. Bundler consumers will tree-shake; non-bundler consumers will download individual ESM files from a CDN.

- **Do not make options deep-merge vs shallow-array dance with defaults.** Either require full option objects (strict, easy to type, easier to version) or do deep merge consistently. No mixed semantics.

---

## Section 18 - Success criteria

The rebuild is done when:

1. **Bundle size** is under 20 KB minified+gzipped for the core (was 58.8 KB).
2. **LOC** is under 3,500 lines of TypeScript (was ~7,000 of JS).
3. **Unit test coverage** is over 90% on state/events/engine, over 80% overall.
4. **No globals** (`window.fullpage_api` exists only if the compat layer is loaded).
5. **Multi-instance works.** Two decks on one page, fully independent.
6. **Mid-animation cancellation works.** Rapid `moveTo` calls interrupt each other cleanly.
7. **Framework wrappers are under 100 LOC each**.
8. **TypeScript `--strict` passes**.
9. **The 20 most common v4 usage patterns work via `@fullpage/v4-compat`** without user code changes.
10. **Bench: average wheel handler duration < 0.5 ms** on mid-range hardware (was ~1.5 ms).

Hitting all 10 is a full rebuild. Hitting 6 of 10 is a useful v5 beta.

---

## Section 19 - Open questions

These are decisions to make early in the rebuild; this document does not prescribe answers.

1. **Naming.** `@fullpage/core` vs `fullpage` vs something new. The repo is `alvarotrigo/fullpage.js`; a fork under a different name changes the conversation.
2. **Licence.** The rebuild could be MIT-only (open source, no commercial licence model) or GPL-with-commercial-alt-licence like the current library. MIT reduces user friction but changes the funding model for the commercial plugins.
3. **Browser-native scroll snap.** Does `scroll-snap-type` suffice for the "fit to section" behaviour? If yes, delete the `fitToSection` code entirely; if not, the JS fit-to-section logic is needed as a fallback.
4. **Server-side rendering.** Framework wrappers need an SSR-safe path. Does `useFullpage` in SSR just render the shell and defer init to client?
5. **A11y audit.** The current library is mediocre on accessibility. Is the rebuild an opportunity to fix it, and if so, who owns that work?
6. **Native browser "full-page" behaviour.** Some newer CSS (`overflow-scroll-snap`, `scroll-behavior: smooth`, `100dvh`) edges toward replacing the library entirely for basic use cases. The rebuild should clearly articulate where the JS library is still necessary (slide carousels, lazy loading, URL anchor sync, cross-section animations).

---

## Closing

The fullpage.js 4.0.41 codebase solves a non-trivial problem and solves it well enough that the library has been widely used for a decade. The weak spots in this catalogue are mostly accumulated technical debt from supporting old browsers, maintaining jQuery compatibility, and growing a feature set without refactoring the core.

A rebuild that targets modern browsers, uses modern web platform APIs, and structures the plugin model explicitly can deliver the same user-facing behaviour in roughly half the code, with fewer bugs, better types, and a clean migration path. The effort is about 10 weeks for a solo developer familiar with the source (shorter with a small team).

The single most valuable architectural change is making the `Fullpage` instance first-class (not a global) with a typed event bus. Most other improvements follow naturally from that one.
