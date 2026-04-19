/**
 * Shared types for Snapdeck core.
 * All runtime structures are immutable once constructed.
 */

export type Trigger = 'wheel' | 'touch' | 'keyboard' | 'api' | 'anchor' | 'init';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export type AnchorOrIndex = string | number;

export interface Section {
  readonly index: number;
  readonly anchor: string | null;
  readonly element: HTMLElement;
  readonly slides: ReadonlyArray<Slide>;
  readonly isActive: boolean;
}

export interface Slide {
  readonly index: number;
  readonly anchor: string | null;
  readonly element: HTMLElement;
  readonly parentSectionIndex: number;
  readonly isActive: boolean;
}

export interface NavigationPayload {
  readonly origin: Section;
  readonly destination: Section;
  readonly direction: Direction;
  readonly trigger: Trigger;
}

export interface SlideNavigationPayload {
  readonly section: Section;
  readonly origin: Slide;
  readonly destination: Slide;
  readonly direction: Direction;
  readonly trigger: Trigger;
}

export interface ResizePayload {
  readonly width: number;
  readonly height: number;
}

export interface OverflowPayload {
  readonly section: Section;
  readonly reachedTop: boolean;
  readonly reachedBottom: boolean;
}

export interface SnapdeckState {
  readonly sections: ReadonlyArray<Section>;
  readonly slides: ReadonlyArray<Slide>;
  readonly activeSectionIndex: number;
  readonly isAnimating: boolean;
  readonly canScroll: boolean;
  readonly isResponsive: boolean;
  readonly width: number;
  readonly height: number;
  readonly scrollY: number;
  readonly scrollX: number;
  /**
   * Active slide index per section, aligned to `sections` by position.
   * An entry of 0 means "first slide" (or "no slides" when the section has none).
   */
  readonly activeSlidePerSection: ReadonlyArray<number>;
}

export interface SnapdeckOptions {
  readonly sectionSelector: string;
  readonly slideSelector: string;
  readonly anchors: ReadonlyArray<string>;
  readonly scrollingSpeed: number;
  readonly easing: string;
  readonly loopTop: boolean;
  readonly loopBottom: boolean;
  readonly responsiveWidth: number;
  readonly responsiveHeight: number;
  readonly keyboardScrolling: boolean;
  readonly wheelDebounceMs: number;
  readonly touchSensitivityPct: number;
  readonly fitToSection: boolean;
  readonly fitToSectionDelayMs: number;
  readonly lazyLoading: boolean;
  readonly recordHistory: boolean;
  readonly lockAnchors: boolean;
  readonly css3: boolean;
  readonly plugins: ReadonlyArray<Plugin>;
}

/** Subset of option keys that may be changed at runtime via setOption. */
export type RuntimeOptionKey =
  | 'scrollingSpeed'
  | 'easing'
  | 'loopTop'
  | 'loopBottom'
  | 'keyboardScrolling'
  | 'wheelDebounceMs'
  | 'touchSensitivityPct'
  | 'fitToSection'
  | 'fitToSectionDelayMs'
  | 'lazyLoading'
  | 'recordHistory'
  | 'lockAnchors';

export interface SnapdeckEvents {
  beforeLeave: (payload: NavigationPayload) => boolean | void;
  onLeave: (payload: NavigationPayload) => boolean | void;
  afterLoad: (payload: NavigationPayload) => void;
  afterRender: (payload: { activeSection: Section }) => void;
  afterResize: (payload: ResizePayload) => void;
  afterResponsive: (isResponsive: boolean) => void;
  afterSlideLoad: (payload: SlideNavigationPayload) => void;
  onSlideLeave: (payload: SlideNavigationPayload) => boolean | void;
  onScrollOverflow: (payload: OverflowPayload) => void;
  afterRebuild: () => void;
}

export type SnapdeckEventName = keyof SnapdeckEvents;

export type Unsubscribe = () => void;

export interface Plugin {
  readonly name: string;
  install(instance: SnapdeckInstance): void;
  destroy(): void;
}

export interface SnapdeckInstance {
  readonly state: Readonly<SnapdeckState>;
  readonly activeSection: Section | null;
  readonly activeSlide: Slide | null;

  moveTo(target: AnchorOrIndex, slide?: AnchorOrIndex): Promise<void>;
  moveUp(): Promise<void>;
  moveDown(): Promise<void>;
  moveSlideLeft(): Promise<void>;
  moveSlideRight(): Promise<void>;
  silentMoveTo(target: AnchorOrIndex, slide?: AnchorOrIndex): void;

  on<K extends SnapdeckEventName>(event: K, handler: SnapdeckEvents[K]): Unsubscribe;

  setOption<K extends RuntimeOptionKey>(key: K, value: SnapdeckOptions[K]): void;
  getOption<K extends keyof SnapdeckOptions>(key: K): SnapdeckOptions[K];

  refresh(): void;
  destroy(): void;
}
