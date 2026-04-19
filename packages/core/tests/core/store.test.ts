/**
 * Store / reducer test suite.
 *
 * Audit notes (self-review of src/core during Role 2):
 *
 *  [FIXED] navigate/start: early-return only when already animating AND the
 *          destination index matches. Re-targeting mid-flight must produce a
 *          new state object so the engine can diff the new destination.
 *
 *  [FIXED] navigate/end: early-return only when NOT animating and the active
 *          index already matches. Otherwise we must flip isAnimating back to
 *          false and commit the destination.
 *
 *  [FIXED] structure/set idempotence: compares sections and slides by
 *          reference, not by deep equality. Callers are expected to pass
 *          the same ReadonlyArray instance for no-op dispatches.
 *
 *  [FIXED] Listener snapshotting: listeners Set is cloned before emission so
 *          a subscriber that unsubscribes another subscriber during a
 *          notification does not skip an untouched neighbour.
 *
 *  [FIXED] Error isolation: a throwing listener does not abort the rest of
 *          the notification loop; error is logged via console.error.
 *
 *  [GAP NOT FIXED] Deep equality for structure updates is intentionally left
 *          out. The mount module is expected to produce a fresh array only
 *          when structure actually changes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Section, Slide, SnapdeckState } from '../../src/types.js';
import type { Action } from '../../src/core/actions.js';
import { createInitialState } from '../../src/core/initial-state.js';
import { reduce } from '../../src/core/reducer.js';
import { Store } from '../../src/core/store.js';

function makeSection(index: number): Section {
  return {
    index,
    anchor: null,
    element: document.createElement('section'),
    slides: [],
    isActive: false,
  };
}

function makeSlide(index: number, parentSectionIndex: number): Slide {
  return {
    index,
    anchor: null,
    element: document.createElement('div'),
    parentSectionIndex,
    isActive: false,
  };
}

describe('createInitialState', () => {
  it('returns a fresh object each call (no shared reference)', () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
  });

  it('matches the documented shape and defaults', () => {
    const s = createInitialState();
    expect(s).toEqual<SnapdeckState>({
      sections: [],
      slides: [],
      activeSectionIndex: -1,
      isAnimating: false,
      canScroll: true,
      isResponsive: false,
      width: 0,
      height: 0,
      scrollY: 0,
      scrollX: 0,
    });
  });
});

describe('reduce', () => {
  let state: SnapdeckState;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('structure/set', () => {
    it('updates sections and slides', () => {
      const sections = [makeSection(0), makeSection(1)];
      const slides = [makeSlide(0, 1)];
      const next = reduce(state, { type: 'structure/set', sections, slides });
      expect(next).not.toBe(state);
      expect(next.sections).toBe(sections);
      expect(next.slides).toBe(slides);
    });

    it('is idempotent when the same array refs are passed', () => {
      const sections = [makeSection(0)];
      const slides: Slide[] = [];
      const a = reduce(state, { type: 'structure/set', sections, slides });
      const b = reduce(a, { type: 'structure/set', sections, slides });
      expect(b).toBe(a);
    });
  });

  describe('navigate/start', () => {
    it('flips isAnimating and sets destination', () => {
      const next = reduce(state, {
        type: 'navigate/start',
        origin: 0,
        destination: 2,
        direction: 'down',
        trigger: 'api',
      });
      expect(next.isAnimating).toBe(true);
      expect(next.activeSectionIndex).toBe(2);
      expect(next).not.toBe(state);
    });

    it('is idempotent when already animating to the same destination', () => {
      const a = reduce(state, {
        type: 'navigate/start',
        origin: 0,
        destination: 2,
        direction: 'down',
        trigger: 'api',
      });
      const b = reduce(a, {
        type: 'navigate/start',
        origin: 0,
        destination: 2,
        direction: 'down',
        trigger: 'api',
      });
      expect(b).toBe(a);
    });

    it('produces a new state when mid-flight destination changes', () => {
      const a = reduce(state, {
        type: 'navigate/start',
        origin: 0,
        destination: 1,
        direction: 'down',
        trigger: 'api',
      });
      const b = reduce(a, {
        type: 'navigate/start',
        origin: 0,
        destination: 3,
        direction: 'down',
        trigger: 'api',
      });
      expect(b).not.toBe(a);
      expect(b.activeSectionIndex).toBe(3);
    });
  });

  describe('navigate/end', () => {
    it('clears isAnimating and commits destination', () => {
      const mid = reduce(state, {
        type: 'navigate/start',
        origin: 0,
        destination: 2,
        direction: 'down',
        trigger: 'api',
      });
      const end = reduce(mid, { type: 'navigate/end', destination: 2 });
      expect(end.isAnimating).toBe(false);
      expect(end.activeSectionIndex).toBe(2);
    });

    it('is idempotent when already settled on destination', () => {
      const mid = reduce(state, {
        type: 'navigate/start',
        origin: 0,
        destination: 2,
        direction: 'down',
        trigger: 'api',
      });
      const a = reduce(mid, { type: 'navigate/end', destination: 2 });
      const b = reduce(a, { type: 'navigate/end', destination: 2 });
      expect(b).toBe(a);
    });
  });

  describe('navigate/cancel', () => {
    it('clears isAnimating when animating', () => {
      const mid = reduce(state, {
        type: 'navigate/start',
        origin: 0,
        destination: 1,
        direction: 'down',
        trigger: 'api',
      });
      const cancelled = reduce(mid, { type: 'navigate/cancel' });
      expect(cancelled.isAnimating).toBe(false);
      expect(cancelled.activeSectionIndex).toBe(1);
    });

    it('is idempotent when not animating', () => {
      const a = reduce(state, { type: 'navigate/cancel' });
      expect(a).toBe(state);
    });
  });

  describe('resize', () => {
    it('updates width and height', () => {
      const next = reduce(state, { type: 'resize', width: 1024, height: 768 });
      expect(next.width).toBe(1024);
      expect(next.height).toBe(768);
    });

    it('is idempotent for unchanged dimensions', () => {
      const a = reduce(state, { type: 'resize', width: 1024, height: 768 });
      const b = reduce(a, { type: 'resize', width: 1024, height: 768 });
      expect(b).toBe(a);
    });
  });

  describe('responsive/set', () => {
    it('updates isResponsive', () => {
      const next = reduce(state, { type: 'responsive/set', isResponsive: true });
      expect(next.isResponsive).toBe(true);
    });

    it('is idempotent when value is unchanged', () => {
      const next = reduce(state, { type: 'responsive/set', isResponsive: false });
      expect(next).toBe(state);
    });
  });

  describe('scroll/set', () => {
    it('updates scrollX and scrollY', () => {
      const next = reduce(state, { type: 'scroll/set', scrollX: 10, scrollY: 20 });
      expect(next.scrollX).toBe(10);
      expect(next.scrollY).toBe(20);
    });

    it('is idempotent when values are unchanged', () => {
      const a = reduce(state, { type: 'scroll/set', scrollX: 10, scrollY: 20 });
      const b = reduce(a, { type: 'scroll/set', scrollX: 10, scrollY: 20 });
      expect(b).toBe(a);
    });
  });

  describe('canScroll/set', () => {
    it('updates canScroll', () => {
      const next = reduce(state, { type: 'canScroll/set', canScroll: false });
      expect(next.canScroll).toBe(false);
    });

    it('is idempotent when value is unchanged', () => {
      const next = reduce(state, { type: 'canScroll/set', canScroll: true });
      expect(next).toBe(state);
    });
  });

  it('never mutates the input state', () => {
    const snapshot = { ...state };
    reduce(state, { type: 'resize', width: 1, height: 2 });
    reduce(state, { type: 'canScroll/set', canScroll: false });
    reduce(state, { type: 'scroll/set', scrollX: 9, scrollY: 9 });
    expect(state).toEqual(snapshot);
  });
});

describe('Store', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('exposes initial state via getState', () => {
    const store = new Store();
    expect(store.getState()).toEqual(createInitialState());
  });

  it('accepts a custom initial state', () => {
    const custom: SnapdeckState = { ...createInitialState(), width: 42 };
    const store = new Store(custom);
    expect(store.getState()).toBe(custom);
  });

  it('notifies subscribers on real state changes with (next, prev)', () => {
    const store = new Store();
    const prevState = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);

    const action: Action = { type: 'resize', width: 800, height: 600 };
    store.dispatch(action);

    expect(listener).toHaveBeenCalledTimes(1);
    const call = listener.mock.calls[0] as [SnapdeckState, SnapdeckState];
    expect(call[0]).toBe(store.getState());
    expect(call[1]).toBe(prevState);
    expect(call[0]).not.toBe(call[1]);
  });

  it('does not notify when reduce returns the same reference (idempotent dispatch)', () => {
    const store = new Store();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: 'resize', width: 800, height: 600 });
    store.dispatch({ type: 'resize', width: 800, height: 600 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops further notifications', () => {
    const store = new Store();
    const listener = vi.fn();
    const off = store.subscribe(listener);

    store.dispatch({ type: 'resize', width: 100, height: 100 });
    off();
    store.dispatch({ type: 'resize', width: 200, height: 200 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('isolates one throwing subscriber from the others', () => {
    const store = new Store();
    const good1 = vi.fn();
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good2 = vi.fn();

    store.subscribe(good1);
    store.subscribe(bad);
    store.subscribe(good2);

    store.dispatch({ type: 'resize', width: 1, height: 1 });

    expect(good1).toHaveBeenCalledTimes(1);
    expect(bad).toHaveBeenCalledTimes(1);
    expect(good2).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
  });

  it('allows a subscriber to unsubscribe another mid-notification without skipping peers', () => {
    const store = new Store();
    const c = vi.fn();
    const b = vi.fn(() => {
      offC();
    });
    const a = vi.fn();

    store.subscribe(a);
    store.subscribe(b);
    const offC = store.subscribe(c);

    store.dispatch({ type: 'resize', width: 10, height: 10 });

    // snapshot semantics: c was in the set when dispatch started, so it fires once,
    // and subsequent dispatches skip it.
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);

    store.dispatch({ type: 'resize', width: 20, height: 20 });
    expect(c).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledTimes(2);
  });

  it('routes every action type through dispatch', () => {
    const store = new Store();
    const listener = vi.fn();
    store.subscribe(listener);

    const sections = [makeSection(0), makeSection(1)];
    const slides = [makeSlide(0, 0)];

    const actions: ReadonlyArray<Action> = [
      { type: 'structure/set', sections, slides },
      { type: 'resize', width: 1000, height: 800 },
      { type: 'responsive/set', isResponsive: true },
      { type: 'scroll/set', scrollX: 0, scrollY: 50 },
      { type: 'canScroll/set', canScroll: false },
      { type: 'navigate/start', origin: 0, destination: 1, direction: 'down', trigger: 'api' },
      { type: 'navigate/end', destination: 1 },
      { type: 'navigate/start', origin: 1, destination: 2, direction: 'down', trigger: 'wheel' },
      { type: 'navigate/cancel' },
    ];

    for (const action of actions) store.dispatch(action);
    expect(listener).toHaveBeenCalledTimes(actions.length);

    const finalState = store.getState();
    expect(finalState.sections).toBe(sections);
    expect(finalState.width).toBe(1000);
    expect(finalState.isResponsive).toBe(true);
    expect(finalState.scrollY).toBe(50);
    expect(finalState.canScroll).toBe(false);
    expect(finalState.activeSectionIndex).toBe(2);
    expect(finalState.isAnimating).toBe(false);
  });
});
