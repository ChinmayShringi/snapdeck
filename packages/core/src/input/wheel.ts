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

/**
 * Gap between wheel events (ms) above which we consider a fresh gesture. A
 * continuous trackpad stream fires every ~16 ms; a real second flick has a
 * much larger gap. Inertia tails remain in the continuous-stream band, so
 * this distinguishes "user intent" from "momentum leftover".
 */
const NEW_GESTURE_GAP_MS = 120;

export function attachWheelInput(options: WheelInputOptions): WheelInputHandle {
  const { target, debounceMs, onNavigate, shouldIgnore, isLocked } = options;

  let lastFireTime = 0;
  let lastWheelTime = 0;
  let stopped = false;

  const handler = (event: WheelEvent): void => {
    if (shouldIgnore?.(event) === true) {
      return;
    }

    event.preventDefault();

    const now = performance.now();
    const gapSinceLastWheel = now - lastWheelTime;
    lastWheelTime = now;

    if (isLocked?.() === true) {
      return;
    }

    const { deltaY } = event;
    if (deltaY === 0) {
      return;
    }

    // Treat this event as a new gesture only if there is a meaningful gap
    // since the previous wheel event. Continuous streams (active scroll, or
    // post-animation inertia tail) fire far more frequently than this, so
    // they never re-fire a nav. The very first event after attach has
    // lastWheelTime = 0, which produces a huge gap and naturally fires.
    const isNewGesture = gapSinceLastWheel >= NEW_GESTURE_GAP_MS;
    if (!isNewGesture) {
      return;
    }

    if (now - lastFireTime < debounceMs) {
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
