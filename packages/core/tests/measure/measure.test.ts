/**
 * Audit notes (tester/auditor):
 * - Target coverage: ≥90% lines across src/measure/*.ts.
 * - ResizeObserver is not provided by happy-dom, so we stub it with a manual
 *   fire mechanism via `vi.stubGlobal` and assert the debounce collapses
 *   rapid entries into a single callback.
 * - matchMedia is stubbed per-test with a tracked listener list so we can
 *   verify subscribe + removeEventListener on stop().
 * - All debounce timing tests use `vi.useFakeTimers()` + `vi.advanceTimersByTime`.
 * - We never assert specific happy-dom innerWidth/innerHeight values; we
 *   only check that getViewportSize returns finite numbers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSizeObserver,
  getViewportSize,
  matchResponsive,
  measureOnce,
  watchMedia,
} from '../../src/measure/index.js';

type RoCallback = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;

interface StubbedRo {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  fire: (width: number, height: number) => void;
}

function installResizeObserverStub(): { instances: StubbedRo[] } {
  const instances: StubbedRo[] = [];
  class FakeResizeObserver {
    private cb: RoCallback;
    public observe = vi.fn();
    public disconnect = vi.fn();
    constructor(cb: RoCallback) {
      this.cb = cb;
      instances.push({
        observe: this.observe,
        disconnect: this.disconnect,
        fire: (width: number, height: number) => {
          this.cb([{ contentRect: { width, height } }]);
        },
      });
    }
    unobserve(): void {
      /* no-op */
    }
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  return { instances };
}

describe('getViewportSize', () => {
  it('returns numeric width and height in a browser-like env', () => {
    const size = getViewportSize();
    expect(typeof size.width).toBe('number');
    expect(typeof size.height).toBe('number');
    expect(Number.isFinite(size.width)).toBe(true);
    expect(Number.isFinite(size.height)).toBe(true);
  });
});

describe('matchResponsive', () => {
  it('returns false when both thresholds are 0', () => {
    expect(matchResponsive({ responsiveWidth: 0, responsiveHeight: 0 })).toBe(false);
  });

  it('returns true when width threshold exceeds viewport', () => {
    const huge = (getViewportSize().width || 1024) + 10_000;
    expect(matchResponsive({ responsiveWidth: huge, responsiveHeight: 0 })).toBe(true);
  });

  it('returns true when height threshold exceeds viewport', () => {
    const huge = (getViewportSize().height || 768) + 10_000;
    expect(matchResponsive({ responsiveWidth: 0, responsiveHeight: huge })).toBe(true);
  });

  it('returns false when thresholds are well below viewport', () => {
    expect(matchResponsive({ responsiveWidth: 1, responsiveHeight: 1 })).toBe(false);
  });
});

describe('viewport non-browser path', () => {
  it('returns zeroed size and matchResponsive=false when not in a browser', async () => {
    vi.resetModules();
    vi.doMock('../../src/utils/is-browser.js', () => ({
      isBrowser: () => false,
    }));
    const mod = await import('../../src/measure/viewport.js');
    expect(mod.getViewportSize()).toEqual({ width: 0, height: 0 });
    expect(mod.matchResponsive({ responsiveWidth: 9999, responsiveHeight: 9999 })).toBe(false);
    vi.doUnmock('../../src/utils/is-browser.js');
    vi.resetModules();
  });

  it('matchesQuery falls back to innerWidth when matchMedia throws', () => {
    const original = window.matchMedia;
    (window as unknown as { matchMedia: unknown }).matchMedia = () => {
      throw new Error('nope');
    };
    try {
      const huge = (window.innerWidth || 1024) + 10_000;
      expect(matchResponsive({ responsiveWidth: huge, responsiveHeight: 0 })).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('measureOnce', () => {
  it('returns width/height from getBoundingClientRect', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = (() =>
      ({ width: 321, height: 123, top: 0, left: 0, right: 321, bottom: 123, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
    expect(measureOnce(el)).toEqual({ width: 321, height: 123 });
  });
});

describe('createSizeObserver', () => {
  let stub: { instances: StubbedRo[] };

  beforeEach(() => {
    vi.useFakeTimers();
    stub = installResizeObserverStub();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('constructs a ResizeObserver and observes the target', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    const handle = createSizeObserver(el, cb);
    expect(stub.instances).toHaveLength(1);
    expect(stub.instances[0]!.observe).toHaveBeenCalledTimes(1);
    handle.stop();
  });

  it('debounces rapid resize callbacks into a single invocation', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    const handle = createSizeObserver(el, cb, { debounceMs: 100 });
    const ro = stub.instances[0]!;

    ro.fire(10, 10);
    ro.fire(20, 20);
    ro.fire(30, 30);

    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith({ width: 30, height: 30 });

    handle.stop();
  });

  it('stop() prevents future callbacks and cancels pending debounce', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    const handle = createSizeObserver(el, cb, { debounceMs: 50 });
    const ro = stub.instances[0]!;

    ro.fire(10, 10);
    handle.stop();
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
    expect(ro.disconnect).toHaveBeenCalledTimes(1);

    // Idempotent: a second stop() must not throw or double-disconnect.
    handle.stop();
    expect(ro.disconnect).toHaveBeenCalledTimes(1);
  });

  it('falls back to window resize listener when ResizeObserver is missing', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('ResizeObserver', undefined);

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const el = document.createElement('div');
    el.getBoundingClientRect = (() =>
      ({ width: 50, height: 60, top: 0, left: 0, right: 50, bottom: 60, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
    const cb = vi.fn();
    const handle = createSizeObserver(el, cb, { debounceMs: 30 });

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(30);
    expect(cb).toHaveBeenCalledWith({ width: 50, height: 60 });

    handle.stop();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('watchMedia', () => {
  interface FakeMql {
    matches: boolean;
    listeners: Array<(e: MediaQueryListEvent) => void>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  }

  function installMatchMediaStub(initialMatches = false): { mql: FakeMql } {
    const mql: FakeMql = {
      matches: initialMatches,
      listeners: [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mql.addEventListener.mockImplementation(
      (_evt: string, fn: (e: MediaQueryListEvent) => void) => {
        mql.listeners.push(fn);
      },
    );
    mql.removeEventListener.mockImplementation(
      (_evt: string, fn: (e: MediaQueryListEvent) => void) => {
        mql.listeners = mql.listeners.filter((x) => x !== fn);
      },
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql),
    );
    (window as unknown as { matchMedia: unknown }).matchMedia = (
      globalThis as unknown as { matchMedia: unknown }
    ).matchMedia;
    return { mql };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('subscribes via addEventListener and unsubscribes via stop()', () => {
    const { mql } = installMatchMediaStub(false);
    const cb = vi.fn();
    const handle = watchMedia('(max-width: 600px)', cb);

    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(handle.matches()).toBe(false);

    mql.listeners.forEach((fn) => fn({ matches: true } as MediaQueryListEvent));
    expect(cb).toHaveBeenCalledWith(true);

    handle.stop();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('stop() is idempotent', () => {
    const { mql } = installMatchMediaStub(true);
    const handle = watchMedia('(min-width: 1px)', vi.fn());
    handle.stop();
    handle.stop();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op watcher when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
    try {
      const cb = vi.fn();
      const handle = watchMedia('(max-width: 600px)', cb);
      expect(handle.matches()).toBe(false);
      expect(() => handle.stop()).not.toThrow();
      expect(cb).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });
});
