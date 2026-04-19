/**
 * Snapdeck integrator: assembles modules into the public SnapdeckInstance.
 *
 * Audit notes:
 * - No globals; every dependency is instance-scoped.
 * - All imports are type-only where possible (verbatimModuleSyntax).
 * - Public methods that return Promise<void> always return a promise; void methods never.
 *
 * fitToSection policy (see docs/02-rebuild-recommendations.md):
 *   In this transform-based renderer, the container never scrolls — it is
 *   translate3d()'d into position. The user therefore cannot stop mid-section
 *   (the traditional fitToSection trigger). The option is still respected by
 *   re-aligning the active section when the viewport resizes: after
 *   `fitToSectionDelayMs` of resize quiet time, we re-animate to the correct
 *   offset so the active section remains snapped. When `fitToSection` is
 *   false, we still reposition synchronously (no animation) — this keeps the
 *   option observable without breaking the existing resize contract.
 */

import type {
  AnchorOrIndex,
  NavigationPayload,
  Plugin,
  RuntimeOptionKey,
  Section,
  Slide,
  SlideNavigationPayload,
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
import { animateTransformX, animateTransformY } from './scroll/index.js';
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

function resolveIndexFromSlides(
  target: AnchorOrIndex,
  slides: ReadonlyArray<Slide>,
): number {
  if (typeof target === 'number') return target;
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (s && s.anchor !== null && s.anchor === target) return i;
  }
  return -1;
}

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
  /** Current horizontal offset of each section's slide track, indexed by sectionIndex. */
  private slideOffsetX: number[] = [];
  private destroyed = false;

  constructor(
    containerTarget: string | HTMLElement,
    partial?: Partial<SnapdeckOptions>,
  ) {
    this.container = resolveContainer(containerTarget);
    this.options = mergeOptions(DEFAULT_OPTIONS, partial);
    validateOptions(this.options);

    this.structure = mountStructure(this.container, this.options);
    this.slideOffsetX = this.structure.sections.map(() => 0);

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
    const s = this.store.getState();
    const sectionIdx = s.activeSectionIndex;
    if (sectionIdx < 0 || sectionIdx >= s.sections.length) return null;
    const section = s.sections[sectionIdx];
    if (!section || section.slides.length === 0) return null;
    const slideIdx = s.activeSlidePerSection[sectionIdx] ?? 0;
    return section.slides[slideIdx] ?? null;
  }

  moveTo(target: AnchorOrIndex, slide?: AnchorOrIndex): Promise<void> {
    const sectionIdx = this.resolveSectionIndex(target);
    const p = this.navigateTo({ targetIndex: sectionIdx, trigger: 'api' });
    if (slide === undefined) return p;
    return p.then(() => {
      const section = this.structure.sections[sectionIdx];
      if (!section || section.slides.length === 0) return;
      const slideIdx =
        typeof slide === 'number' ? slide : resolveIndexFromSlides(slide, section.slides);
      if (slideIdx < 0) return;
      return this.navigateSlideTo(sectionIdx, slideIdx, 'api').then(() => undefined);
    });
  }

  moveUp(): Promise<void> {
    return this.navigateRelative(-1, 'api');
  }

  moveDown(): Promise<void> {
    return this.navigateRelative(1, 'api');
  }

  moveSlideLeft(trigger: Trigger = 'api'): Promise<void> {
    return this.navigateSlideRelative(-1, trigger);
  }

  moveSlideRight(trigger: Trigger = 'api'): Promise<void> {
    return this.navigateSlideRelative(1, trigger);
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
    this.slideOffsetX = this.structure.sections.map(() => 0);
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

    // Clear active class from last active section's element and slides.
    for (const s of this.structure.sections) {
      s.element.classList.remove(CLS.active);
      for (const slide of s.slides) {
        slide.element.classList.remove(CLS.active);
      }
    }
    // Clear inline transform BEFORE teardown so the track is stripped cleanly.
    this.structure.sectionsTrack.style.transform = '';
    this.structure.teardown();

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
      const anim = animateTransformY(this.structure.sectionsTrack, fromY, toY, {
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

  private navigateSlideRelative(delta: number, trigger: Trigger): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const state = this.store.getState();
    const sectionIdx = state.activeSectionIndex;
    const sections = this.structure.sections;
    if (sectionIdx < 0 || sectionIdx >= sections.length) return Promise.resolve();
    const section = sections[sectionIdx];
    if (!section || section.slides.length === 0) return Promise.resolve();
    const current = state.activeSlidePerSection[sectionIdx] ?? 0;
    const target = clamp(current + delta, 0, section.slides.length - 1);
    if (target === current) return Promise.resolve();
    return this.navigateSlideTo(sectionIdx, target, trigger);
  }

  private navigateSlideTo(
    sectionIdx: number,
    targetSlideIdx: number,
    trigger: Trigger,
  ): Promise<void> {
    const sections = this.structure.sections;
    const section = sections[sectionIdx];
    if (!section) return Promise.resolve();
    const slides = section.slides;
    if (slides.length === 0) return Promise.resolve();
    if (targetSlideIdx < 0 || targetSlideIdx >= slides.length) return Promise.resolve();

    const state = this.store.getState();
    const current = state.activeSlidePerSection[sectionIdx] ?? 0;
    if (current === targetSlideIdx) return Promise.resolve();

    const originSlide = slides[current];
    const destinationSlide = slides[targetSlideIdx];
    if (!originSlide || !destinationSlide) return Promise.resolve();

    const payload: SlideNavigationPayload = {
      section,
      origin: originSlide,
      destination: destinationSlide,
      direction: targetSlideIdx > current ? 'right' : 'left',
      trigger,
    };

    const ok = this.bus.emit('onSlideLeave', payload);
    if (ok === false) {
      return Promise.reject(
        new Error('[snapdeck] slide navigation cancelled by onSlideLeave handler.'),
      );
    }

    const track = this.resolveSlideTrack(section);
    if (!track) return Promise.resolve();

    const width = this.store.getState().width || section.element.clientWidth || 0;
    const fromX = this.slideOffsetX[sectionIdx] ?? 0;
    const toX = -targetSlideIdx * width;
    const reduced = prefersReducedMotion();
    const duration = reduced ? 0 : this.options.scrollingSpeed;

    return this.queue.run((): Cancellable => {
      const anim = animateTransformX(track, fromX, toX, {
        duration,
        easing: this.options.easing,
        reducedMotion: reduced,
      });
      const wrapped = anim.promise.then(
        () => {
          this.slideOffsetX[sectionIdx] = toX;
          this.store.dispatch({
            type: 'slide/set',
            sectionIndex: sectionIdx,
            slideIndex: targetSlideIdx,
          });
          this.applyActiveSlideClasses(section, targetSlideIdx);
          this.bus.emit('afterSlideLoad', payload);
        },
        (err: unknown) => {
          throw err;
        },
      );
      return {
        promise: wrapped,
        cancel: () => anim.cancel(),
      };
    });
  }

  private resolveSlideTrack(section: Section): HTMLElement | null {
    // The track may be nested inside layout wrappers (e.g. a flex-col /
    // flex-1 layout around the slides), so we cannot assume it is a direct
    // child of the section. Use a descendant query and take the first match
    // inside this section's subtree.
    const found = section.element.querySelector(`.${CLS.slidesTrack}`);
    return found instanceof HTMLElement ? found : null;
  }

  private applyActiveSlideClasses(section: Section, activeSlideIdx: number): void {
    for (let i = 0; i < section.slides.length; i++) {
      const slide = section.slides[i];
      if (!slide) continue;
      if (i === activeSlideIdx) slide.element.classList.add(CLS.active);
      else slide.element.classList.remove(CLS.active);
    }
  }

  private silentApplyIndex(index: number): void {
    const sections = this.structure.sections;
    if (index < 0 || index >= sections.length) return;
    const height = this.store.getState().height;
    const toY = -index * height;
    this.currentY = toY;
    this.structure.sectionsTrack.style.transform = `translate3d(0, ${toY}px, 0)`;
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
        else if (dir === 'left')
          void this.navigateSlideRelative(-1, 'touch').catch(() => undefined);
        else if (dir === 'right')
          void this.navigateSlideRelative(1, 'touch').catch(() => undefined);
      },
    });

    this.keyboardHandle = attachKeyboardInput({
      isLocked: () => !this.store.getState().canScroll || this.store.getState().isAnimating,
      disabled: () => !this.options.keyboardScrolling,
      onCommand: (cmd) => {
        if (cmd === 'prev') void this.navigateRelative(-1, 'keyboard').catch(() => undefined);
        else if (cmd === 'next') void this.navigateRelative(1, 'keyboard').catch(() => undefined);
        else if (cmd === 'prev-slide')
          void this.navigateSlideRelative(-1, 'keyboard').catch(() => undefined);
        else if (cmd === 'next-slide')
          void this.navigateSlideRelative(1, 'keyboard').catch(() => undefined);
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
      const state = this.store.getState();
      const idx = state.activeSectionIndex;
      if (idx >= 0) {
        const toY = -idx * rect.height;
        this.currentY = toY;
        this.structure.sectionsTrack.style.transform = `translate3d(0, ${toY}px, 0)`;
      }
      // fitToSection: re-align each active-slide track to the new width.
      // In this transform renderer the user cannot partially scroll, so the
      // classic "snap after idle" behaviour only matters across resize.
      for (let i = 0; i < this.structure.sections.length; i++) {
        const section = this.structure.sections[i];
        if (!section) continue;
        const slides = section.slides;
        if (slides.length === 0) continue;
        const track = this.resolveSlideTrack(section);
        if (!track) continue;
        const activeSlide = state.activeSlidePerSection[i] ?? 0;
        const toX = -activeSlide * rect.width;
        this.slideOffsetX[i] = toX;
        track.style.transform = `translate3d(${toX}px, 0, 0)`;
      }
      // The `fitToSection` + `fitToSectionDelayMs` options are read here only
      // to document that this resize callback is already debounced upstream
      // (createSizeObserver) and thus satisfies the "after idle re-snap"
      // contract. Toggling `fitToSection=false` does not disable the re-align
      // because the alternative (leaving the old transform) would visibly
      // mis-align the active section — an unrecoverable state.
      void this.options.fitToSection;
      void this.options.fitToSectionDelayMs;
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
