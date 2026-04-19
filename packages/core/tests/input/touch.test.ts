/**
 * Audit notes:
 * - Tests import the module directly from '../../src/input/touch.js' so this
 *   suite stays independent from the shared src/input/index.ts barrel, which
 *   is owned by the wheel team during this wave.
 * - happy-dom >=15 supports window.PointerEvent with pointerId/pointerType/
 *   clientX/clientY in the constructor dict (verified via a smoke run). No
 *   fallback Event shim required.
 * - window.innerWidth / innerHeight are stubbed to 1000 at the top of each
 *   test via Object.defineProperty so threshold math is deterministic.
 * - setPointerCapture / releasePointerCapture are stubbed per-test where the
 *   behaviour matters (e.g. the "error swallowed" test) to exercise the
 *   try/catch without relying on happy-dom internals.
 * - Each test creates its own target element and handle, and asserts via a
 *   jest-style spy (vi.fn()) on onNavigate. Locked/disabled paths verify that
 *   no callback is invoked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachTouchInput, type TouchInputHandle } from '../../src/input/touch.js';

const VIEWPORT = 1000;

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
}

function makeTarget(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function clearBody(): void {
  while (document.body.firstChild !== null) {
    document.body.removeChild(document.body.firstChild);
  }
}

interface PointerInit {
  readonly pointerId?: number;
  readonly pointerType?: string;
  readonly clientX?: number;
  readonly clientY?: number;
}

function dispatch(
  target: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: PointerInit,
): void {
  const ev = new window.PointerEvent(type, {
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'touch',
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    isPrimary: true,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(ev);
}

describe('attachTouchInput', () => {
  let handle: TouchInputHandle | null = null;

  beforeEach(() => {
    setViewport(VIEWPORT, VIEWPORT);
  });

  afterEach(() => {
    handle?.stop();
    handle = null;
    clearBody();
  });

  it('emits "down" for a vertical swipe up (dy negative, past threshold)', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { clientX: 500, clientY: 400 });
    dispatch(target, 'pointerup', { clientX: 500, clientY: 400 });

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('down');
  });

  it('emits "up" for a vertical swipe down', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 100 });
    dispatch(target, 'pointermove', { clientX: 500, clientY: 600 });
    dispatch(target, 'pointerup', { clientX: 500, clientY: 600 });

    expect(onNavigate).toHaveBeenCalledWith('up');
  });

  it('emits "right" for a horizontal swipe left', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 900, clientY: 500 });
    dispatch(target, 'pointermove', { clientX: 300, clientY: 505 });
    dispatch(target, 'pointerup', { clientX: 300, clientY: 505 });

    expect(onNavigate).toHaveBeenCalledWith('right');
  });

  it('emits "left" for a horizontal swipe right', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 100, clientY: 500 });
    dispatch(target, 'pointermove', { clientX: 700, clientY: 505 });
    dispatch(target, 'pointerup', { clientX: 700, clientY: 505 });

    expect(onNavigate).toHaveBeenCalledWith('left');
  });

  it('does not emit when delta is below threshold on both axes', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    // 10% of 1000 = 100px threshold. Move 30px: below.
    handle = attachTouchInput({ target, sensitivityPct: 10, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 500 });
    dispatch(target, 'pointermove', { clientX: 520, clientY: 530 });
    dispatch(target, 'pointerup', { clientX: 520, clientY: 530 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('rejects pointerType "mouse" by default', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { pointerType: 'mouse', clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { pointerType: 'mouse', clientX: 500, clientY: 100 });
    dispatch(target, 'pointerup', { pointerType: 'mouse', clientX: 500, clientY: 100 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('accepts pointerType "pen" by default', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { pointerType: 'pen', clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { pointerType: 'pen', clientX: 500, clientY: 300 });
    dispatch(target, 'pointerup', { pointerType: 'pen', clientX: 500, clientY: 300 });

    expect(onNavigate).toHaveBeenCalledWith('down');
  });

  it('respects a custom acceptPointerType filter', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({
      target,
      sensitivityPct: 5,
      onNavigate,
      acceptPointerType: (t) => t === 'mouse',
    });

    // touch should now be rejected
    dispatch(target, 'pointerdown', { pointerType: 'touch', clientX: 500, clientY: 900 });
    dispatch(target, 'pointerup', { pointerType: 'touch', clientX: 500, clientY: 100 });
    expect(onNavigate).not.toHaveBeenCalled();

    // mouse should be accepted
    dispatch(target, 'pointerdown', { pointerType: 'mouse', clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { pointerType: 'mouse', clientX: 500, clientY: 100 });
    dispatch(target, 'pointerup', { pointerType: 'mouse', clientX: 500, clientY: 100 });
    expect(onNavigate).toHaveBeenCalledWith('down');
  });

  it('pointercancel does not emit even if threshold was crossed', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { clientX: 500, clientY: 100 });
    dispatch(target, 'pointercancel', { clientX: 500, clientY: 100 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores secondary pointers; start position from first pointer is preserved', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    // Primary pointer starts at y=900
    dispatch(target, 'pointerdown', { pointerId: 1, clientX: 500, clientY: 900 });
    // Secondary pointer down far away; must not overwrite the gesture start
    dispatch(target, 'pointerdown', { pointerId: 2, clientX: 200, clientY: 200 });
    // Secondary pointer moves around; must be ignored
    dispatch(target, 'pointermove', { pointerId: 2, clientX: 200, clientY: 800 });
    // Primary pointer moves upward past threshold
    dispatch(target, 'pointermove', { pointerId: 1, clientX: 500, clientY: 300 });
    // Secondary pointerup should not end the gesture
    dispatch(target, 'pointerup', { pointerId: 2, clientX: 200, clientY: 800 });
    expect(onNavigate).not.toHaveBeenCalled();
    // Primary pointerup resolves navigation based on original start
    dispatch(target, 'pointerup', { pointerId: 1, clientX: 500, clientY: 300 });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('down');
  });

  it('isLocked=true suppresses navigation', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({
      target,
      sensitivityPct: 5,
      onNavigate,
      isLocked: () => true,
    });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { clientX: 500, clientY: 100 });
    dispatch(target, 'pointerup', { clientX: 500, clientY: 100 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('stop() detaches listeners', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    handle.stop();

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 900 });
    dispatch(target, 'pointermove', { clientX: 500, clientY: 100 });
    dispatch(target, 'pointerup', { clientX: 500, clientY: 100 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('stop() is idempotent', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    expect(() => {
      handle!.stop();
      handle!.stop();
      handle!.stop();
    }).not.toThrow();
  });

  it('swallows setPointerCapture errors', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    // Force setPointerCapture / releasePointerCapture to throw.
    const original = {
      set: target.setPointerCapture,
      release: target.releasePointerCapture,
    };
    target.setPointerCapture = () => {
      throw new Error('not supported');
    };
    target.releasePointerCapture = () => {
      throw new Error('not supported');
    };

    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    expect(() => {
      dispatch(target, 'pointerdown', { clientX: 500, clientY: 900 });
      dispatch(target, 'pointermove', { clientX: 500, clientY: 300 });
      dispatch(target, 'pointerup', { clientX: 500, clientY: 300 });
    }).not.toThrow();

    expect(onNavigate).toHaveBeenCalledWith('down');

    // Restore to avoid leaking into other tests.
    target.setPointerCapture = original.set;
    target.releasePointerCapture = original.release;
  });

  it('stop() mid-gesture releases capture and drops the active pointer', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 900 });
    handle.stop();
    // Further events must not trigger navigation.
    dispatch(target, 'pointermove', { clientX: 500, clientY: 100 });
    dispatch(target, 'pointerup', { clientX: 500, clientY: 100 });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores pointermove/pointerup for a pointerId we never saw a down for', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    // No pointerdown — stray move/up should be ignored gracefully.
    dispatch(target, 'pointermove', { pointerId: 42, clientX: 500, clientY: 500 });
    dispatch(target, 'pointerup', { pointerId: 42, clientX: 500, clientY: 500 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when pointerdown and pointerup are at the same position', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    dispatch(target, 'pointerdown', { clientX: 500, clientY: 500 });
    dispatch(target, 'pointerup', { clientX: 500, clientY: 500 });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('uses horizontal axis when |dx| exceeds |dy| even if both cross', () => {
    const target = makeTarget();
    const onNavigate = vi.fn();
    handle = attachTouchInput({ target, sensitivityPct: 5, onNavigate });

    // dx = -600, dy = -200; horizontal dominant -> 'right'
    dispatch(target, 'pointerdown', { clientX: 900, clientY: 700 });
    dispatch(target, 'pointermove', { clientX: 300, clientY: 500 });
    dispatch(target, 'pointerup', { clientX: 300, clientY: 500 });

    expect(onNavigate).toHaveBeenCalledWith('right');
  });
});
