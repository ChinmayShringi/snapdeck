/**
 * Pointer-event-based touch input for section navigation.
 *
 * Design (see docs/02-rebuild-recommendations.md section 8):
 * - Unified under Pointer Events: one handler path for mouse/touch/stylus.
 * - Threshold is a percentage of the viewport dimension (0..100), resolved
 *   against window.innerHeight / innerWidth at gesture end so that resizes
 *   mid-gesture are naturally respected.
 * - Emits a single direction on pointerup/pointercancel if the dominant-axis
 *   delta crosses the threshold. Swipe-up emits 'down' (content moves down)
 *   and swipe-left emits 'right', matching natural scroll semantics.
 * - Only the pointer that started the gesture is tracked; secondary pointers
 *   are ignored so multi-touch does not clobber the active gesture.
 * - All listeners are { passive: true }. Scroll suppression happens at wheel
 *   level; we never call preventDefault here.
 * - No internal timers.
 */

export interface TouchInputOptions {
  readonly target: HTMLElement;
  /** Minimum drag distance as percentage of viewport dimension (0..100). */
  readonly sensitivityPct: number;
  readonly onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  readonly isLocked?: () => boolean;
  /** optional filter; default accepts 'touch' and 'pen', rejects 'mouse'. */
  readonly acceptPointerType?: (type: string) => boolean;
}

export interface TouchInputHandle {
  stop(): void;
}

interface ActiveGesture {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly startX: number;
  readonly startY: number;
  currentX: number;
  currentY: number;
}

const defaultAcceptPointerType = (type: string): boolean =>
  type === 'touch' || type === 'pen';

export function attachTouchInput(options: TouchInputOptions): TouchInputHandle {
  const {
    target,
    sensitivityPct,
    onNavigate,
    isLocked,
    acceptPointerType = defaultAcceptPointerType,
  } = options;

  let active: ActiveGesture | null = null;
  let stopped = false;

  const releaseCapture = (pointerId: number): void => {
    try {
      // happy-dom may not implement pointer capture; swallow silently.
      target.releasePointerCapture(pointerId);
    } catch {
      // intentionally ignored
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (active !== null) {
      // Already tracking a gesture; ignore secondary pointers.
      return;
    }
    if (!acceptPointerType(event.pointerType)) {
      return;
    }

    active = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    };

    try {
      // happy-dom may not implement setPointerCapture; swallow silently.
      target.setPointerCapture(event.pointerId);
    } catch {
      // intentionally ignored
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (active === null || event.pointerId !== active.pointerId) {
      return;
    }
    active.currentX = event.clientX;
    active.currentY = event.clientY;
  };

  const finish = (event: PointerEvent, emit: boolean): void => {
    if (active === null || event.pointerId !== active.pointerId) {
      return;
    }

    const gesture = active;
    active = null;
    releaseCapture(gesture.pointerId);

    if (!emit) {
      return;
    }
    if (isLocked?.() === true) {
      return;
    }

    const dx = gesture.currentX - gesture.startX;
    const dy = gesture.currentY - gesture.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx === 0 && absDy === 0) {
      return;
    }

    const thresholdX = (sensitivityPct / 100) * window.innerWidth;
    const thresholdY = (sensitivityPct / 100) * window.innerHeight;

    if (absDy >= absDx) {
      // vertical dominant
      if (absDy <= thresholdY) {
        return;
      }
      onNavigate(dy < 0 ? 'down' : 'up');
    } else {
      // horizontal dominant
      if (absDx <= thresholdX) {
        return;
      }
      onNavigate(dx < 0 ? 'right' : 'left');
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    finish(event, true);
  };

  const onPointerCancel = (event: PointerEvent): void => {
    finish(event, false);
  };

  const listenerOptions: AddEventListenerOptions = { passive: true };

  target.addEventListener('pointerdown', onPointerDown as EventListener, listenerOptions);
  target.addEventListener('pointermove', onPointerMove as EventListener, listenerOptions);
  target.addEventListener('pointerup', onPointerUp as EventListener, listenerOptions);
  target.addEventListener('pointercancel', onPointerCancel as EventListener, listenerOptions);

  return {
    stop(): void {
      if (stopped) {
        return;
      }
      stopped = true;
      target.removeEventListener('pointerdown', onPointerDown as EventListener);
      target.removeEventListener('pointermove', onPointerMove as EventListener);
      target.removeEventListener('pointerup', onPointerUp as EventListener);
      target.removeEventListener('pointercancel', onPointerCancel as EventListener);
      if (active !== null) {
        releaseCapture(active.pointerId);
        active = null;
      }
    },
  };
}
