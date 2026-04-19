# @snapdeck/angular

Angular bindings for [Snapdeck](https://github.com/ChinmayShringi/snapdeck), a framework-agnostic section-snap scroll library. Ships a single standalone directive that wires a Snapdeck instance to the host element and exposes the engine via `exportAs`. Supports Angular 18, 19, 20.

- **Repo**: [github.com/ChinmayShringi/snapdeck](https://github.com/ChinmayShringi/snapdeck)
- **Docs + live demo**: [chinmayshringi.github.io/snapdeck](https://chinmayshringi.github.io/snapdeck/)
- **License**: MIT. Independent clean-room implementation (not derived from any GPL scroll library).

SSR-safe via `isPlatformBrowser`, works with Angular Universal / Analog.

## Install

```bash
npm install @snapdeck/angular @snapdeck/core
# peers: @angular/core >=18, @angular/common >=18, rxjs >=7
```

## Usage

```ts
import { Component } from '@angular/core';
import { SnapdeckDirective, type NavigationPayload } from '@snapdeck/angular';
import '@snapdeck/core/css';

@Component({
  standalone: true,
  imports: [SnapdeckDirective],
  selector: 'app-root',
  template: `
    <div
      snapdeck
      #deck="snapdeck"
      [options]="{ anchors: ['intro', 'features', 'pricing'], scrollingSpeed: 700 }"
      (afterLoad)="onAfterLoad($event)"
      (beforeLeave)="onBeforeLeave($event)"
    >
      <section data-snapdeck-section data-anchor="intro">Intro</section>
      <section data-snapdeck-section data-anchor="features">Features</section>
      <section data-snapdeck-section data-anchor="pricing">Pricing</section>
    </div>

    <button (click)="deck.api?.moveSectionDown()">Next</button>
    <button (click)="deck.api?.moveTo('pricing')">Jump to pricing</button>
  `,
})
export class AppComponent {
  onAfterLoad(payload: NavigationPayload) {
    console.log('arrived at', payload.destination.anchor);
  }
  onBeforeLeave(payload: NavigationPayload) {
    // Return `false` from a handler hooked via `deck.api.on('beforeLeave', …)`
    // to cancel; the `(beforeLeave)` Output is purely informational.
  }
}
```

### With plugins

```ts
import { navDots } from '@snapdeck/plugin-nav-dots';
import { progressBar } from '@snapdeck/plugin-progress-bar';

template: `
  <div snapdeck [options]="deckOptions">…</div>
`;

deckOptions = {
  plugins: [navDots(), progressBar({ position: 'top' })],
};
```

## API

- `SnapdeckDirective`, standalone directive, selector `[snapdeck]`, `exportAs: 'snapdeck'`.
  - `@Input() options: Partial<SnapdeckOptions>`
  - `@Output() afterLoad: EventEmitter<NavigationPayload>`
  - `@Output() beforeLeave: EventEmitter<NavigationPayload>`
  - `@Output() afterRender: EventEmitter<{ activeSection: Section }>`
  - `readonly api: SnapdeckInstance | null`, full core API once mounted.

For imperative control use `deck.api?.moveTo(...)`, `deck.api?.setOption(...)`, etc.

## Build note

Built with [tsup](https://tsup.egoist.dev) (not ng-packagr) to stay consistent with the rest of the Snapdeck monorepo. Emits flat ESM + CJS + `.d.ts` at `es2022`. Angular CLI (webpack or esbuild) consumes it like any other published library.

## License

MIT. Independent clean-room implementation.
