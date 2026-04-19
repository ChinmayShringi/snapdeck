import {
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import type { OnDestroy, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import snapdeck, {
  type NavigationPayload,
  type Section,
  type SnapdeckInstance,
  type SnapdeckOptions,
  type Unsubscribe,
} from '@snapdeck/core';

/**
 * SnapdeckDirective
 *
 * Standalone directive that wires a Snapdeck instance to the host element.
 *
 * Usage:
 *   <div snapdeck #deck="snapdeck"
 *        [options]="{ anchors: ['one','two'] }"
 *        (afterLoad)="onAfterLoad($event)">
 *     <section class="snapdeck-section">...</section>
 *     <section class="snapdeck-section">...</section>
 *   </div>
 *
 * Then `deck.api?.moveDown()` from the template or component.
 *
 * SSR-safe: the Snapdeck instance is only constructed in the browser.
 */
@Directive({
  selector: '[snapdeck]',
  standalone: true,
  exportAs: 'snapdeck',
})
export class SnapdeckDirective implements OnInit, OnDestroy {
  @Input() options: Partial<SnapdeckOptions> = {};

  @Output() afterLoad = new EventEmitter<NavigationPayload>();
  @Output() beforeLeave = new EventEmitter<NavigationPayload>();
  @Output() afterRender = new EventEmitter<{ activeSection: Section }>();

  private instance: SnapdeckInstance | null = null;
  private readonly subscriptions: Unsubscribe[] = [];

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  get api(): SnapdeckInstance | null {
    return this.instance;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const instance = snapdeck(this.el.nativeElement, this.options);
    this.instance = instance;

    this.subscriptions.push(
      instance.on('afterLoad', (payload) => this.afterLoad.emit(payload)),
      instance.on('beforeLeave', (payload) => {
        this.beforeLeave.emit(payload);
      }),
      instance.on('afterRender', (payload) => this.afterRender.emit(payload)),
    );
  }

  ngOnDestroy(): void {
    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions.length = 0;
    this.instance?.destroy();
    this.instance = null;
  }
}
