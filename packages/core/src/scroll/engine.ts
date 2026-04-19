/**
 * Scroll engine: a single Web Animations API path for vertical translate
 * transitions, with cancellation and Promise-based completion.
 *
 * Design notes:
 *   - Callers own the timing (`duration`, `easing`) and reduced-motion flag;
 *     the engine does not read options module, nor any global state.
 *   - Only vertical translation is handled. Horizontal slide movement is a
 *     separate concern handled by slide modules.
 *   - On completion, `commitStyles()` writes the final transform to
 *     `element.style` and the Animation is cancelled from the effect stack
 *     so subsequent engine runs start from a clean baseline.
 *   - Cancellation rejects the returned promise with an AbortError-like
 *     error (name === 'AbortError'), so callers can distinguish cancellation
 *     from genuine failures via `try/catch` + `err.name`.
 *   - Fallback path: if `Element.prototype.animate` is unavailable, or the
 *     element's `animate` method is missing at runtime, the engine sets the
 *     transform synchronously and resolves immediately.
 */

export interface ScrollAnimation {
  readonly promise: Promise<void>;
  cancel(): void;
  readonly finished: boolean;
  readonly cancelled: boolean;
}

export interface AnimateOptions {
  /** Duration in milliseconds. */
  duration: number;
  /** Any valid CSS easing string (e.g. 'ease', 'cubic-bezier(...)', 'linear'). */
  easing: string;
  /** If true, the transform is set directly and the promise resolves immediately. */
  reducedMotion?: boolean;
}

/**
 * Error name used for cancellation rejections. Chosen to align with the
 * DOM `AbortError` convention so callers can branch on `err.name`.
 */
const ABORT_ERROR_NAME = 'AbortError';

function createAbortError(message = 'Scroll animation cancelled'): Error {
  const err = new Error(message);
  err.name = ABORT_ERROR_NAME;
  return err;
}

function transformKeyframe(y: number): string {
  return `translate3d(0, ${y}px, 0)`;
}

function transformKeyframeX(x: number): string {
  return `translate3d(${x}px, 0, 0)`;
}

function hasAnimateSupport(target: HTMLElement): boolean {
  // Guard for environments (e.g. happy-dom without stub) where Element.animate
  // is missing. We check both the prototype (feature detect) and the instance
  // (runtime deletions / stubs cleared in tests).
  const proto =
    typeof Element !== 'undefined' && Element.prototype
      ? (Element.prototype as unknown as { animate?: unknown })
      : undefined;
  const protoHas = !!proto && typeof proto.animate === 'function';
  const instanceHas =
    typeof (target as unknown as { animate?: unknown }).animate === 'function';
  return protoHas || instanceHas;
}

/**
 * Animate an element from `fromY` to `toY` on the Y axis using translate3d.
 * Returns a ScrollAnimation whose `promise` resolves on completion and
 * rejects (with AbortError) on cancellation.
 */
export function animateTransformY(
  target: HTMLElement,
  fromY: number,
  toY: number,
  opts: AnimateOptions,
): ScrollAnimation {
  const { duration, easing, reducedMotion = false } = opts;

  // Immutable flags held in a small state object; public getters expose them.
  const state = {
    finished: false,
    cancelled: false,
  };

  // Fast path: reduced motion, zero duration, or missing animate support.
  const instant =
    reducedMotion === true || duration === 0 || !hasAnimateSupport(target);

  if (instant) {
    target.style.transform = transformKeyframe(toY);
    state.finished = true;
    return {
      promise: Promise.resolve(),
      cancel: () => {
        // No-op after instant resolve; still flip cancelled for observability
        // only if not already finished. We keep finished=true, cancelled=false
        // because the animation did complete.
      },
      get finished() {
        return state.finished;
      },
      get cancelled() {
        return state.cancelled;
      },
    };
  }

  const animation = target.animate(
    [
      { transform: transformKeyframe(fromY) },
      { transform: transformKeyframe(toY) },
    ],
    { duration, easing, fill: 'forwards' },
  );

  const promise = animation.finished.then(
    () => {
      // Write the final transform to inline style so it persists after we
      // clear the animation from the effect stack.
      try {
        animation.commitStyles();
      } catch {
        // commitStyles throws if the element is disconnected or the effect
        // has no target; in that case, mirror the final frame manually.
        target.style.transform = transformKeyframe(toY);
      }
      animation.cancel();
      state.finished = true;
    },
    (err: unknown) => {
      // `animation.finished` rejects on cancel with an AbortError.
      state.cancelled = true;
      const reason =
        err instanceof Error && err.name === ABORT_ERROR_NAME
          ? err
          : createAbortError();
      throw reason;
    },
  );

  return {
    promise,
    cancel: () => {
      if (state.finished || state.cancelled) return;
      state.cancelled = true;
      animation.cancel();
    },
    get finished() {
      return state.finished;
    },
    get cancelled() {
      return state.cancelled;
    },
  };
}

/**
 * Animate an element from `fromX` to `toX` on the X axis using translate3d.
 * Mirrors {@link animateTransformY} for horizontal slide navigation.
 */
export function animateTransformX(
  target: HTMLElement,
  fromX: number,
  toX: number,
  opts: AnimateOptions,
): ScrollAnimation {
  const { duration, easing, reducedMotion = false } = opts;

  const state = {
    finished: false,
    cancelled: false,
  };

  const instant =
    reducedMotion === true || duration === 0 || !hasAnimateSupport(target);

  if (instant) {
    target.style.transform = transformKeyframeX(toX);
    state.finished = true;
    return {
      promise: Promise.resolve(),
      cancel: () => {
        /* no-op after instant resolve */
      },
      get finished() {
        return state.finished;
      },
      get cancelled() {
        return state.cancelled;
      },
    };
  }

  const animation = target.animate(
    [
      { transform: transformKeyframeX(fromX) },
      { transform: transformKeyframeX(toX) },
    ],
    { duration, easing, fill: 'forwards' },
  );

  const promise = animation.finished.then(
    () => {
      try {
        animation.commitStyles();
      } catch {
        target.style.transform = transformKeyframeX(toX);
      }
      animation.cancel();
      state.finished = true;
    },
    (err: unknown) => {
      state.cancelled = true;
      const reason =
        err instanceof Error && err.name === ABORT_ERROR_NAME
          ? err
          : createAbortError();
      throw reason;
    },
  );

  return {
    promise,
    cancel: () => {
      if (state.finished || state.cancelled) return;
      state.cancelled = true;
      animation.cancel();
    },
    get finished() {
      return state.finished;
    },
    get cancelled() {
      return state.cancelled;
    },
  };
}
