/**
 * Audit notes
 * ===========
 *
 * happy-dom does not implement `Element.animate`. Each test that exercises
 * the WAAPI code path installs a fake `animate` on `HTMLElement.prototype`
 * that returns an object shaped like the `Animation` interface used by
 * `engine.ts`: `{ finished, cancel, commitStyles }`.
 *
 * Behavioural invariants verified:
 *   1. `target.animate` receives the correct two-frame translate3d keyframes
 *      and `{ duration, easing, fill: 'forwards' }`.
 *   2. The returned promise resolves when `animation.finished` resolves.
 *   3. On natural completion, both `commitStyles` and `cancel` are called
 *      (in that order), and `finished` flips to true.
 *   4. `reducedMotion: true` bypasses `animate`, sets transform inline,
 *      resolves immediately, and reports `finished=true`.
 *   5. `duration: 0` bypasses `animate`, sets transform inline, resolves
 *      immediately.
 *   6. Calling `cancel()` before completion rejects the promise with an
 *      AbortError-named error, invokes `animation.cancel()`, and flips
 *      `cancelled` to true.
 *   7. Public flags `finished` and `cancelled` track state correctly.
 *   8. Fallback when `Element.prototype.animate` is absent: engine sets
 *      transform inline and resolves immediately.
 *
 * These cover the engine contract described in src/scroll/README.md.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateTransformY } from '../../src/scroll/engine.js';

type FakeAnim = {
  finished: Promise<void>;
  cancel: ReturnType<typeof vi.fn>;
  commitStyles: ReturnType<typeof vi.fn>;
  _resolve: () => void;
  _reject: (err: unknown) => void;
};

function makeFakeAnim(): FakeAnim {
  let _resolve!: () => void;
  let _reject!: (err: unknown) => void;
  const finished = new Promise<void>((res, rej) => {
    _resolve = res;
    _reject = rej;
  });
  return {
    finished,
    cancel: vi.fn(),
    commitStyles: vi.fn(),
    _resolve,
    _reject,
  };
}

function installAnimateStub(factory: () => FakeAnim): {
  calls: Array<{
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
    anim: FakeAnim;
  }>;
  restore: () => void;
} {
  const calls: Array<{
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
    anim: FakeAnim;
  }> = [];
  const original = (HTMLElement.prototype as unknown as { animate?: unknown })
    .animate;
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = vi.fn(
    function (
      this: HTMLElement,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions,
    ) {
      const anim = factory();
      calls.push({ keyframes, options, anim });
      return anim as unknown as Animation;
    },
  );
  return {
    calls,
    restore: () => {
      if (original === undefined) {
        delete (HTMLElement.prototype as unknown as { animate?: unknown })
          .animate;
      } else {
        (HTMLElement.prototype as unknown as { animate: unknown }).animate =
          original;
      }
    },
  };
}

function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

function makeTarget(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('animateTransformY', () => {
  let restore: (() => void) | null = null;

  afterEach(() => {
    if (restore) {
      restore();
      restore = null;
    }
    clearBody();
  });

  it('calls animate with correct keyframes and options', async () => {
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      a._resolve();
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const { promise } = animateTransformY(target, 10, 200, {
      duration: 400,
      easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
    });
    await promise;

    expect(stub.calls).toHaveLength(1);
    const call = stub.calls[0]!;
    expect(call.keyframes).toEqual([
      { transform: 'translate3d(0, 10px, 0)' },
      { transform: 'translate3d(0, 200px, 0)' },
    ]);
    expect(call.options).toEqual({
      duration: 400,
      easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
      fill: 'forwards',
    });
  });

  it('promise resolves on finished and calls commitStyles then cancel', async () => {
    let capturedAnim: FakeAnim | null = null;
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      capturedAnim = a;
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 100, {
      duration: 200,
      easing: 'ease',
    });

    expect(h.finished).toBe(false);
    expect(h.cancelled).toBe(false);

    capturedAnim!._resolve();
    await h.promise;

    expect(capturedAnim!.commitStyles).toHaveBeenCalledTimes(1);
    expect(capturedAnim!.cancel).toHaveBeenCalledTimes(1);
    const commitOrder = capturedAnim!.commitStyles.mock.invocationCallOrder[0]!;
    const cancelOrder = capturedAnim!.cancel.mock.invocationCallOrder[0]!;
    expect(commitOrder).toBeLessThan(cancelOrder);
    expect(h.finished).toBe(true);
    expect(h.cancelled).toBe(false);
  });

  it('falls back to manual transform write when commitStyles throws', async () => {
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      a.commitStyles = vi.fn(() => {
        throw new Error('disconnected');
      });
      a._resolve();
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 99, {
      duration: 100,
      easing: 'ease',
    });
    await h.promise;
    expect(target.style.transform).toBe('translate3d(0, 99px, 0)');
    expect(h.finished).toBe(true);
  });

  it('reducedMotion=true: no animate call, transform set directly, resolves immediately', async () => {
    const stub = installAnimateStub(() => {
      throw new Error('should not be called');
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 300, {
      duration: 500,
      easing: 'ease',
      reducedMotion: true,
    });
    await h.promise;
    expect(stub.calls).toHaveLength(0);
    expect(target.style.transform).toBe('translate3d(0, 300px, 0)');
    expect(h.finished).toBe(true);
    expect(h.cancelled).toBe(false);
  });

  it('duration=0: no animate call, transform set directly', async () => {
    const stub = installAnimateStub(() => {
      throw new Error('should not be called');
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 42, {
      duration: 0,
      easing: 'linear',
    });
    await h.promise;
    expect(stub.calls).toHaveLength(0);
    expect(target.style.transform).toBe('translate3d(0, 42px, 0)');
    expect(h.finished).toBe(true);
  });

  it('cancel() on an instant animation is a no-op', () => {
    const stub = installAnimateStub(() => {
      throw new Error('should not be called');
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 10, {
      duration: 0,
      easing: 'linear',
    });
    h.cancel();
    expect(h.finished).toBe(true);
    expect(h.cancelled).toBe(false);
  });

  it('cancel() before finish rejects promise with AbortError and calls animation.cancel', async () => {
    let capturedAnim: FakeAnim | null = null;
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      capturedAnim = a;
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 100, {
      duration: 1000,
      easing: 'ease',
    });

    capturedAnim!.cancel = vi.fn(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      capturedAnim!._reject(err);
    });

    h.cancel();

    await expect(h.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(capturedAnim!.cancel).toHaveBeenCalledTimes(1);
    expect(h.cancelled).toBe(true);
    expect(h.finished).toBe(false);
  });

  it('cancel() wraps non-AbortError rejections as AbortError', async () => {
    let capturedAnim: FakeAnim | null = null;
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      capturedAnim = a;
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 100, {
      duration: 500,
      easing: 'ease',
    });

    capturedAnim!._reject('something else');
    h.cancel();

    await expect(h.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.cancelled).toBe(true);
  });

  it('cancel() is idempotent and safe after finish', async () => {
    let capturedAnim: FakeAnim | null = null;
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      capturedAnim = a;
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const h = animateTransformY(target, 0, 100, {
      duration: 200,
      easing: 'ease',
    });
    capturedAnim!._resolve();
    await h.promise;

    h.cancel();
    expect(h.finished).toBe(true);
    expect(h.cancelled).toBe(false);
    expect(capturedAnim!.cancel).toHaveBeenCalledTimes(1);
  });

  it('flags reflect state transitions (initial, finished, cancelled)', async () => {
    let capturedAnim: FakeAnim | null = null;
    const stub = installAnimateStub(() => {
      const a = makeFakeAnim();
      capturedAnim = a;
      return a;
    });
    restore = stub.restore;

    const target = makeTarget();
    const h1 = animateTransformY(target, 0, 50, {
      duration: 100,
      easing: 'ease',
    });
    expect(h1.finished).toBe(false);
    expect(h1.cancelled).toBe(false);
    capturedAnim!._resolve();
    await h1.promise;
    expect(h1.finished).toBe(true);
    expect(h1.cancelled).toBe(false);

    let secondAnim: FakeAnim | null = null;
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = vi.fn(
      () => {
        const a = makeFakeAnim();
        secondAnim = a;
        a.cancel = vi.fn(() => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          a._reject(err);
        });
        return a as unknown as Animation;
      },
    );
    const h2 = animateTransformY(target, 50, 150, {
      duration: 100,
      easing: 'ease',
    });
    h2.cancel();
    await expect(h2.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(h2.cancelled).toBe(true);
    expect(h2.finished).toBe(false);
    expect(secondAnim).not.toBeNull();
  });

  it('fallback path: works when Element.animate is undefined', async () => {
    const original = (HTMLElement.prototype as unknown as { animate?: unknown })
      .animate;
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    restore = () => {
      if (original !== undefined) {
        (HTMLElement.prototype as unknown as { animate: unknown }).animate =
          original;
      }
    };

    const target = makeTarget();
    const h = animateTransformY(target, 0, 77, {
      duration: 400,
      easing: 'ease',
    });
    await h.promise;
    expect(target.style.transform).toBe('translate3d(0, 77px, 0)');
    expect(h.finished).toBe(true);
    expect(h.cancelled).toBe(false);
  });
});
