/**
 * Action discriminated union for the Snapdeck state store.
 * Every state mutation flows through one of these action shapes, so grepping
 * for a `type` string reveals all call sites that can cause a given change.
 */

import type { Direction, Section, Slide, Trigger } from '../types.js';

export interface StructureSetAction {
  readonly type: 'structure/set';
  readonly sections: ReadonlyArray<Section>;
  readonly slides: ReadonlyArray<Slide>;
}

export interface NavigateStartAction {
  readonly type: 'navigate/start';
  readonly origin: number;
  readonly destination: number;
  readonly direction: Direction;
  readonly trigger: Trigger;
}

export interface NavigateEndAction {
  readonly type: 'navigate/end';
  readonly destination: number;
}

export interface NavigateCancelAction {
  readonly type: 'navigate/cancel';
}

export interface ResizeAction {
  readonly type: 'resize';
  readonly width: number;
  readonly height: number;
}

export interface ResponsiveSetAction {
  readonly type: 'responsive/set';
  readonly isResponsive: boolean;
}

export interface ScrollSetAction {
  readonly type: 'scroll/set';
  readonly scrollX: number;
  readonly scrollY: number;
}

export interface CanScrollSetAction {
  readonly type: 'canScroll/set';
  readonly canScroll: boolean;
}

export interface SlideSetAction {
  readonly type: 'slide/set';
  readonly sectionIndex: number;
  readonly slideIndex: number;
}

export type Action =
  | StructureSetAction
  | NavigateStartAction
  | NavigateEndAction
  | NavigateCancelAction
  | ResizeAction
  | ResponsiveSetAction
  | ScrollSetAction
  | CanScrollSetAction
  | SlideSetAction;
