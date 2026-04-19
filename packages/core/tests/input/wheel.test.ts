/**
 * Audit notes — wheel input
 * -----------------------------------------------------------------------------
 * Contract under test: attachWheelInput from src/input/wheel.ts.
 *
 * Covered behaviour:
 *  - deltaY sign maps to 'up' / 'down'; deltaY === 0 is a no-op.
 *  - preventDefault is called on unignored events (needed to suppress native
 *    page scroll); NOT called when shouldIgnore returns true.
 *  - isLocked swallows the event (preventDefault yes, navigate no).
 *  - Debounce is time-based using performance.now(); two events < debounceMs
 *    apart fire onNavigate once. A third event past the window fires again.
 *  - stop() detaches the listener and is idempotent.
 *
 * Technique: we stub performance.now via vi.spyOn so we fully control elapsed
 * time without touching timers. WheelEvent is synthesised with cancelable:true
 * so defaultPrevented is observable after dispatch.
 *
 * Uncovered (by design): anything beyond a single listener lifecycle, since
 * the module has no internal timers, no shared state, and no DOM mutation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachWheelInput } from '../../src/input/wheel.js';

function makeWheel(deltaY: number): WheelEvent {
  return new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
}

describe('attachWheelInput', () => {
  let target: HTMLElement;
  let now: number;
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    now = 1_000;
    nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    nowSpy.mockRestore();
    target.remove();
  });

  it('fires onNavigate("down") when deltaY > 0', () => {
    const onNavigate = vi.fn();
    attachWheelInput({ target, debounceMs: 200, onNavigate });

    target.dispatchEvent(makeWheel(10));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('down');
  });

  it('fires onNavigate("up") when deltaY < 0', () => {
    const onNavigate = vi.fn();
    attachWheelInput({ target, debounceMs: 200, onNavigate });

    target.dispatchEvent(makeWheel(-10));

    expect(onNavigate).toHaveBeenCalledWith('up');
  });

  it('does nothing when deltaY === 0', () => {
    const onNavigate = vi.fn();
    attachWheelInput({ target, debounceMs: 200, onNavigate });

    const ev = makeWheel(0);
    target.dispatchEvent(ev);

    expect(onNavigate).not.toHaveBeenCalled();
    // preventDefault is still called because the event is not ignored.
    expect(ev.defaultPrevented).toBe(true);
  });

  it('calls preventDefault on unignored events', () => {
    const onNavigate = vi.fn();
    attachWheelInput({ target, debounceMs: 200, onNavigate });

    const ev = makeWheel(5);
    target.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
  });

  it('skips handling when shouldIgnore returns true', () => {
    const onNavigate = vi.fn();
    const shouldIgnore = vi.fn().mockReturnValue(true);
    attachWheelInput({ target, debounceMs: 200, onNavigate, shouldIgnore });

    const ev = makeWheel(5);
    target.dispatchEvent(ev);

    expect(shouldIgnore).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('preventDefaults but does not navigate when isLocked returns true', () => {
    const onNavigate = vi.fn();
    const isLocked = vi.fn().mockReturnValue(true);
    attachWheelInput({ target, debounceMs: 200, onNavigate, isLocked });

    const ev = makeWheel(5);
    target.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('debounces rapid successive events within debounceMs', () => {
    const onNavigate = vi.fn();
    attachWheelInput({ target, debounceMs: 200, onNavigate });

    now = 1_000;
    target.dispatchEvent(makeWheel(5));
    now = 1_050; // 50ms later, still inside window
    target.dispatchEvent(makeWheel(5));
    now = 1_199; // 199ms, still inside
    target.dispatchEvent(makeWheel(5));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('fires again once debounceMs has elapsed', () => {
    const onNavigate = vi.fn();
    attachWheelInput({ target, debounceMs: 200, onNavigate });

    now = 1_000;
    target.dispatchEvent(makeWheel(5));
    now = 1_200; // exactly at the threshold — now - last === 200, not < 200
    target.dispatchEvent(makeWheel(-5));

    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'down');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'up');
  });

  it('stop() detaches the listener', () => {
    const onNavigate = vi.fn();
    const handle = attachWheelInput({ target, debounceMs: 200, onNavigate });

    handle.stop();
    target.dispatchEvent(makeWheel(5));

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('stop() is idempotent', () => {
    const onNavigate = vi.fn();
    const handle = attachWheelInput({ target, debounceMs: 200, onNavigate });

    handle.stop();
    expect(() => handle.stop()).not.toThrow();

    target.dispatchEvent(makeWheel(5));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
