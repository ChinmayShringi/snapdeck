/**
 * Time-debounced wheel input for section navigation.
 *
 * Design (see docs/02-rebuild-recommendations.md section 8):
 * - No array averaging, no acceleration heuristic.
 * - Single `lastFireTime` timestamp (performance.now()) plus a min gap.
 * - Listener registered with { passive: false } because we must call
 *   preventDefault() to stop the browser from scrolling the page.
 */

import type { Direction } from '../types.js';

export interface WheelInputOptions {
  readonly target: HTMLElement;
  readonly debounceMs: number;
  readonly onNavigate: (direction: 'up' | 'down') => void;
  /** return true to skip handling this event (e.g. inside a scrollable inner element). */
  readonly shouldIgnore?: (event: WheelEvent) => boolean;
  /** when true, engine is animating; wheel events are swallowed. */
  readonly isLocked?: () => boolean;
}

export interface WheelInputHandle {
  stop(): void;
}

/** Narrow the navigation direction to the up/down subset Direction supports. */
type VerticalDirection = Extract<Direction, 'up' | 'down'>;

export function attachWheelInput(options: WheelInputOptions): WheelInputHandle {
  const { target, debounceMs, onNavigate, shouldIgnore, isLocked } = options;

  let lastFireTime = 0;
  let stopped = false;

  const handler = (event: WheelEvent): void => {
    if (shouldIgnore?.(event) === true) {
      return;
    }

    event.preventDefault();

    const now = performance.now();

    // While locked (mid-animation) keep bumping lastFireTime so trackpad inertia
    // cannot immediately fire a second navigation the moment the animation ends.
    // The user must actually stop scrolling for `debounceMs` before the next
    // nav can fire. This prevents the "scroll once, advances twice" feel.
    if (isLocked?.() === true) {
      lastFireTime = now;
      return;
    }

    const { deltaY } = event;
    if (deltaY === 0) {
      return;
    }

    if (now - lastFireTime < debounceMs) {
      lastFireTime = now;
      return;
    }
    lastFireTime = now;

    const direction: VerticalDirection = deltaY > 0 ? 'down' : 'up';
    onNavigate(direction);
  };

  target.addEventListener('wheel', handler, { passive: false });

  return {
    stop(): void {
      if (stopped) {
        return;
      }
      stopped = true;
      target.removeEventListener('wheel', handler);
    },
  };
}
