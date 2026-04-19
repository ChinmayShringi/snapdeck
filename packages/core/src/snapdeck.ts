/**
 * Snapdeck integrator: assembles modules into the public SnapdeckInstance.
 *
 * Audit notes:
 * - No globals; every dependency is instance-scoped.
 * - All imports are type-only where possible (verbatimModuleSyntax).
 * - Public methods that return Promise<void> always return a promise; void methods never.
 */

import type {
  AnchorOrIndex,
  NavigationPayload,
  Plugin,
  RuntimeOptionKey,
  Section,
  Slide,
  SnapdeckEventName,
  SnapdeckEvents,
  SnapdeckInstance,
  SnapdeckOptions,
  SnapdeckState,
  Trigger,
  Unsubscribe,
} from './types.js';

import { CLS, mountStructure, resolveContainer } from './dom/index.js';
import type { MountedStructure } from './dom/index.js';
import { Store, createInitialState } from './core/index.js';
import { EventBus } from './events/index.js';
import { DEFAULT_OPTIONS } from './options/defaults.js';
import { mergeOptions } from './options/merge.js';
import { validateOptions } from './options/validate.js';
import { isRuntimeKey } from './options/runtime-keys.js';
import { clamp } from './utils/clamp.js';
import { resolveIndex } from './utils/resolve-index.js';
import { directionBetween } from './utils/direction.js';
import { prefersReducedMotion } from './utils/prefers-reduced-motion.js';
import { createSizeObserver, matchResponsive, measureOnce, watchMedia } from './measure/index.js';
import type { SizeObserverHandle, MediaWatcher } from './measure/index.js';
import { animateTransformY } from './scroll/index.js';
import { CommandQueue } from './queue/index.js';
import type { Cancellable } from './queue/index.js';
import {
  attachAnchorsInput,
  attachKeyboardInput,
  attachTouchInput,
  attachWheelInput,
} from './input/index.js';
import type {
  AnchorsInputHandle,
  KeyboardInputHandle,
  TouchInputHandle,
  WheelInputHandle,
} from './input/index.js';
import { PluginRegistry } from './plugins/registry.js';

interface MoveRequest {
  readonly targetIndex: number;
  readonly trigger: Trigger;
}

export class Snapdeck implements SnapdeckInstance {
  private options: SnapdeckOptions;
  private readonly container: HTMLElement;
  private structure: MountedStructure;
  private readonly store: Store;
  private readonly bus: EventBus<SnapdeckEvents>;
  private readonly queue: CommandQueue;
  private readonly plugins: PluginRegistry;

  private wheelHandle: WheelInputHandle | null = null;
  private touchHandle: TouchInputHandle | null = null;
  private keyboardHandle: KeyboardInputHandle | null = null;
  private anchorsHandle: AnchorsInputHandle | null = null;
  private sizeHandle: SizeObserverHandle | null = null;
  private responsiveWatcher: MediaWatcher | null = null;

  private currentY = 0;
  private destroyed = false;

  constructor(
    containerTarget: string | HTMLElement,
    partial?: Partial<SnapdeckOptions>,
  ) {
    this.container = resolveContainer(containerTarget);
    this.options = mergeOptions(DEFAULT_OPTIONS, partial);
    validateOptions(this.options);

    this.structure = mountStructure(this.container, this.options);

    this.store = new Store(createInitialState());
    this.bus = new EventBus<SnapdeckEvents>();
    this.queue = new CommandQueue();
    this.plugins = new PluginRegistry();

    const rect = measureOnce(this.container);
    this.store.dispatch({
      type: 'structure/set',
      sections: this.structure.sections,
      slides: this.structure.slides,
    });
    this.store.dispatch({ type: 'resize', width: rect.width, height: rect.height });

    this.attachInputs();
    this.attachResponsive();
    this.attachSizeObserver();

    // Install plugins after wiring so plugins observe a ready instance.
    for (const plugin of this.options.plugins) {
      this.plugins.register(plugin, this);
    }

    // Initial active section: either from hash or index 0.
    const sections = this.structure.sections;
    if (sections.length > 0) {
      const fromHash = this.anchorsHandle?.resolveInitial() ?? -1;
      const initial = fromHash >= 0 && fromHash < sections.length ? fromHash : 0;
      this.silentApplyIndex(initial);
      const active = sections[initial];
      if (active) {
        this.bus.emit('afterRender', { activeSection: active });
      }
    }
  }

  // ----- public API -----

  get state(): Readonly<SnapdeckState> {
    return this.store.getState();
  }

  get activeSection(): Section | null {
    const s = this.store.getState();
    const idx = s.activeSectionIndex;
    if (idx < 0 || idx >= s.sections.length) return null;
    return s.sections[idx] ?? null;
  }

  get activeSlide(): Slide | null {
    // Minimal: slides are per-section; we do not track active slide index yet.
    return null;
  }

  moveTo(target: AnchorOrIndex, _slide?: AnchorOrIndex): Promise<void> {
    return this.navigateTo({ targetIndex: this.resolveSectionIndex(target), trigger: 'api' });
  }

  moveUp(): Promise<void> {
    return this.navigateRelative(-1, 'api');
  }

  moveDown(): Promise<void> {
    return this.navigateRelative(1, 'api');
  }

  moveSlideLeft(): Promise<void> {
    return Promise.resolve();
  }

  moveSlideRight(): Promise<void> {
    return Promise.resolve();
  }

  silentMoveTo(target: AnchorOrIndex, _slide?: AnchorOrIndex): void {
    const idx = this.resolveSectionIndex(target);
    const sections = this.structure.sections;
    if (idx < 0 || idx >= sections.length) return;
    this.silentApplyIndex(idx);
  }

  on<K extends SnapdeckEventName>(event: K, handler: SnapdeckEvents[K]): Unsubscribe {
    return this.bus.on(event, handler);
  }

  off<K extends SnapdeckEventName>(event: K, handler: SnapdeckEvents[K]): void {
    this.bus.off(event, handler);
  }

  setOption<K extends RuntimeOptionKey>(key: K, value: SnapdeckOptions[K]): void {
    if (!isRuntimeKey(key)) {
      throw new Error(
        `[snapdeck] setOption: key "${String(key)}" is not runtime-changeable.`,
      );
    }
    this.options = Object.freeze({ ...this.options, [key]: value }) as SnapdeckOptions;
  }

  getOption<K extends keyof SnapdeckOptions>(key: K): SnapdeckOptions[K] {
    return this.options[key];
  }

  refresh(): void {
    if (this.destroyed) return;
    const prevIndex = this.store.getState().activeSectionIndex;
    this.structure.teardown();
    this.structure = mountStructure(this.container, this.options);
    this.store.dispatch({
      type: 'structure/set',
      sections: this.structure.sections,
      slides: this.structure.slides,
    });
    const sections = this.structure.sections;
    if (sections.length === 0) {
      this.bus.emit('afterRebuild');
      return;
    }
    const target = clamp(prevIndex < 0 ? 0 : prevIndex, 0, sections.length - 1);
    this.silentApplyIndex(target);
    this.bus.emit('afterRebuild');
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.queue.cancel();
    this.wheelHandle?.stop();
    this.touchHandle?.stop();
    this.keyboardHandle?.stop();
    this.anchorsHandle?.stop();
    this.sizeHandle?.stop();
    this.responsiveWatcher?.stop();

    this.wheelHandle = null;
    this.touchHandle = null;
    this.keyboardHandle = null;
    this.anchorsHandle = null;
    this.sizeHandle = null;
    this.responsiveWatcher = null;

    this.plugins.destroyAll();

    // Clear active class from last active section's element.
    for (const s of this.structure.sections) {
      s.element.classList.remove(CLS.active);
    }
    this.structure.teardown();

    // Reset inline transform.
    this.container.style.transform = '';

    this.bus.clear();
  }

  // ----- internals -----

  private resolveSectionIndex(target: AnchorOrIndex): number {
    return resolveIndex(target, this.structure.sections);
  }

  private navigateRelative(delta: number, trigger: Trigger): Promise<void> {
    const state = this.store.getState();
    const sections = this.structure.sections;
    if (sections.length === 0) return Promise.resolve();
    const current = state.activeSectionIndex < 0 ? 0 : state.activeSectionIndex;
    let next = current + delta;

    if (delta < 0 && next < 0) {
      next = this.options.loopTop ? sections.length - 1 : current;
    } else if (delta > 0 && next >= sections.length) {
      next = this.options.loopBottom ? 0 : current;
    }

    if (next === current) return Promise.resolve();
    return this.navigateTo({ targetIndex: next, trigger });
  }

  private navigateTo(req: MoveRequest): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const sections = this.structure.sections;
    if (req.targetIndex < 0 || req.targetIndex >= sections.length) {
      return Promise.reject(
        new Error(`[snapdeck] moveTo: index ${req.targetIndex} out of range.`),
      );
    }
    const state = this.store.getState();
    const origin = state.activeSectionIndex < 0 ? 0 : state.activeSectionIndex;
    if (origin === req.targetIndex) return Promise.resolve();

    const originSection = sections[origin];
    const destinationSection = sections[req.targetIndex];
    if (!originSection || !destinationSection) return Promise.resolve();

    const payload: NavigationPayload = {
      origin: originSection,
      destination: destinationSection,
      direction: directionBetween(origin, req.targetIndex),
      trigger: req.trigger,
    };

    const beforeOk = this.bus.emit('beforeLeave', payload);
    if (beforeOk === false) {
      return Promise.reject(new Error('[snapdeck] navigation cancelled by beforeLeave handler.'));
    }

    this.bus.emit('onLeave', payload);

    this.store.dispatch({
      type: 'navigate/start',
      origin,
      destination: req.targetIndex,
      direction: payload.direction,
      trigger: req.trigger,
    });

    const height = this.store.getState().height;
    const fromY = this.currentY;
    const toY = -req.targetIndex * height;
    const reduced = prefersReducedMotion();
    const duration = reduced ? 0 : this.options.scrollingSpeed;

    return this.queue.run((): Cancellable => {
      const anim = animateTransformY(this.container, fromY, toY, {
        duration,
        easing: this.options.easing,
        reducedMotion: reduced,
      });
      // Chain side-effects onto the animation; return a wrapped promise.
      const wrapped = anim.promise.then(
        () => {
          this.currentY = toY;
          this.applyActiveClasses(req.targetIndex);
          this.store.dispatch({ type: 'navigate/end', destination: req.targetIndex });
          this.bus.emit('afterLoad', payload);
          this.anchorsHandle?.onSectionChanged(destinationSection);
        },
        (err: unknown) => {
          this.store.dispatch({ type: 'navigate/cancel' });
          throw err;
        },
      );
      return {
        promise: wrapped,
        cancel: () => anim.cancel(),
      };
    });
  }

  private silentApplyIndex(index: number): void {
    const sections = this.structure.sections;
    if (index < 0 || index >= sections.length) return;
    const height = this.store.getState().height;
    const toY = -index * height;
    this.currentY = toY;
    this.container.style.transform = `translate3d(0, ${toY}px, 0)`;
    this.applyActiveClasses(index);
    this.store.dispatch({ type: 'navigate/end', destination: index });
  }

  private applyActiveClasses(activeIndex: number): void {
    const sections = this.structure.sections;
    for (let i = 0; i < sections.length; i++) {
      const el = sections[i]?.element;
      if (!el) continue;
      if (i === activeIndex) el.classList.add(CLS.active);
      else el.classList.remove(CLS.active);
    }
  }

  private attachInputs(): void {
    this.anchorsHandle = attachAnchorsInput({
      getSections: () => this.structure.sections,
      onNavigate: (sectionIndex: number) => {
        void this.navigateTo({ targetIndex: sectionIndex, trigger: 'anchor' }).catch(
          () => undefined,
        );
      },
      lockAnchors: () => this.options.lockAnchors,
      recordHistory: this.options.recordHistory,
    });

    this.wheelHandle = attachWheelInput({
      target: this.container,
      debounceMs: this.options.wheelDebounceMs,
      isLocked: () => !this.store.getState().canScroll || this.store.getState().isAnimating,
      onNavigate: (dir: 'up' | 'down') => {
        if (dir === 'up') void this.navigateRelative(-1, 'wheel').catch(() => undefined);
        else void this.navigateRelative(1, 'wheel').catch(() => undefined);
      },
    });

    this.touchHandle = attachTouchInput({
      target: this.container,
      sensitivityPct: this.options.touchSensitivityPct,
      isLocked: () => !this.store.getState().canScroll || this.store.getState().isAnimating,
      onNavigate: (dir) => {
        if (dir === 'up') void this.navigateRelative(-1, 'touch').catch(() => undefined);
        else if (dir === 'down') void this.navigateRelative(1, 'touch').catch(() => undefined);
        // left/right: slide navigation not implemented in minimal integrator.
      },
    });

    this.keyboardHandle = attachKeyboardInput({
      isLocked: () => !this.store.getState().canScroll || this.store.getState().isAnimating,
      disabled: () => !this.options.keyboardScrolling,
      onCommand: (cmd) => {
        if (cmd === 'prev') void this.navigateRelative(-1, 'keyboard').catch(() => undefined);
        else if (cmd === 'next') void this.navigateRelative(1, 'keyboard').catch(() => undefined);
        else if (cmd === 'home')
          void this.navigateTo({ targetIndex: 0, trigger: 'keyboard' }).catch(() => undefined);
        else if (cmd === 'end') {
          const last = this.structure.sections.length - 1;
          if (last >= 0)
            void this.navigateTo({ targetIndex: last, trigger: 'keyboard' }).catch(() => undefined);
        }
      },
    });
  }

  private attachSizeObserver(): void {
    this.sizeHandle = createSizeObserver(this.container, (rect) => {
      this.store.dispatch({ type: 'resize', width: rect.width, height: rect.height });
      this.bus.emit('afterResize', { width: rect.width, height: rect.height });
      // Re-align current section to new height.
      const idx = this.store.getState().activeSectionIndex;
      if (idx >= 0) {
        const toY = -idx * rect.height;
        this.currentY = toY;
        this.container.style.transform = `translate3d(0, ${toY}px, 0)`;
      }
    });
  }

  private attachResponsive(): void {
    const { responsiveWidth, responsiveHeight } = this.options;
    if (responsiveWidth <= 0 && responsiveHeight <= 0) return;
    const parts: string[] = [];
    if (responsiveWidth > 0) parts.push(`(max-width: ${responsiveWidth - 1}px)`);
    if (responsiveHeight > 0) parts.push(`(max-height: ${responsiveHeight - 1}px)`);
    const query = parts.join(', ');
    const initial = matchResponsive({ responsiveWidth, responsiveHeight });
    this.store.dispatch({ type: 'responsive/set', isResponsive: initial });
    this.responsiveWatcher = watchMedia(query, (matches) => {
      this.store.dispatch({ type: 'responsive/set', isResponsive: matches });
      this.bus.emit('afterResponsive', matches);
    });
  }
}

export function createSnapdeck(
  container: string | HTMLElement,
  options?: Partial<SnapdeckOptions>,
): SnapdeckInstance {
  return new Snapdeck(container, options);
}

export type { Plugin };
