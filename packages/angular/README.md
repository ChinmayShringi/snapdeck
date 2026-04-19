# @snapdeck/angular

Angular bindings for [Snapdeck](https://github.com/) — a modern section-snap
scroll engine. Ships a single standalone directive that wires a Snapdeck
instance to the host element and exposes the engine via `exportAs`.

Supports Angular 18, 19, and 20.

## Install

```bash
pnpm add @snapdeck/angular @snapdeck/core
```

## Build tooling note

This package is built with [tsup](https://tsup.egoist.dev) (not ng-packagr) to
stay consistent with the rest of the Snapdeck monorepo. It emits flat ESM,
CJS, and `.d.ts` with an `es2022` target. Angular CLI (webpack or esbuild)
consumes it like any other published library; no Angular-specific build
metadata is required for a library this thin.

## Usage

```ts
// app.component.ts
import { Component } from '@angular/core';
import {
  SnapdeckDirective,
  type NavigationPayload,
} from '@snapdeck/angular';

@Component({
  standalone: true,
  imports: [SnapdeckDirective],
  selector: 'app-root',
  template: `
    <div
      snapdeck
      #deck="snapdeck"
      [options]="{ anchors: ['intro', 'features', 'pricing'] }"
      (afterLoad)="onAfterLoad($event)"
      (beforeLeave)="onBeforeLeave($event)"
    >
      <section class="snapdeck-section">Intro</section>
      <section class="snapdeck-section">Features</section>
      <section class="snapdeck-section">Pricing</section>
    </div>

    <button (click)="deck.api?.moveDown()">Next</button>
  `,
})
export class AppComponent {
  onAfterLoad(payload: NavigationPayload) {
    console.log('arrived at', payload.destination.anchor);
  }
  onBeforeLeave(payload: NavigationPayload) {
    console.log('leaving', payload.origin.anchor);
  }
}
```

## SSR

`ngOnInit` checks `PLATFORM_ID` via `isPlatformBrowser` and only constructs
the Snapdeck instance in the browser. Safe for Angular Universal / Analog.

## API

- `SnapdeckDirective` — standalone directive, selector `[snapdeck]`,
  `exportAs: 'snapdeck'`.
  - `@Input() options: Partial<SnapdeckOptions>`
  - `@Output() afterLoad: EventEmitter<NavigationPayload>`
  - `@Output() beforeLeave: EventEmitter<NavigationPayload>`
  - `@Output() afterRender: EventEmitter<{ activeSection: Section }>`
  - `readonly api: SnapdeckInstance | null` — full core API once mounted.

Use `deck.api?.moveTo(...)`, `deck.api?.setOption(...)`, etc. for imperative
control.

## License

MIT
