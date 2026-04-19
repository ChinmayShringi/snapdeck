/**
 * Audit notes
 * ------------
 * Focus of this suite:
 *   1. Correct attachment: the MutationObserver is installed on the first
 *      section's parentElement with a narrow config.
 *   2. Filtering: only mutations whose added/removed nodes match the section
 *      selector trigger a refresh; unrelated mutations are dropped.
 *   3. Debouncing: rapid successive mutations collapse into a single
 *      refresh() call after debounceMs.
 *   4. Teardown: destroy() disconnects the observer, clears pending timers,
 *      and is idempotent.
 *   5. Capability fallback: if MutationObserver is undefined, install and
 *      destroy must not throw.
 *
 * Strategy:
 *   - MutationObserver is stubbed via vi.stubGlobal with a minimal class that
 *     records observe()/disconnect() calls and exposes fire(records) so tests
 *     drive the callback deterministically.
 *   - setTimeout is driven via vi.useFakeTimers so debounce semantics are
 *     tested without real time.
 *   - The SnapdeckInstance is a hand-rolled stub exposing only the surface
 *     the plugin reads: state.sections, getOption, refresh.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Section, SnapdeckInstance } from '@snapdeck/core';
import { observer } from '../src/plugin.js';

type MoRecordLike = Pick<MutationRecord, 'type' | 'addedNodes' | 'removedNodes'>;

interface StubMO {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  fire: (records: MoRecordLike[]) => void;
  readonly target: Node | null;
  readonly options: MutationObserverInit | null;
}

let lastMo: StubMO | null = null;

function installMoStub(): void {
  class FakeMO {
    public observe: ReturnType<typeof vi.fn>;
    public disconnect: ReturnType<typeof vi.fn>;
    public target: Node | null = null;
    public options: MutationObserverInit | null = null;
    private cb: MutationCallback;

    constructor(cb: MutationCallback) {
      this.cb = cb;
      this.observe = vi.fn((t: Node, o?: MutationObserverInit) => {
        this.target = t;
        this.options = o ?? null;
      });
      this.disconnect = vi.fn();
      const self = this;
      lastMo = {
        observe: this.observe,
        disconnect: this.disconnect,
        fire: (records) =>
          self.cb(
            records as unknown as MutationRecord[],
            self as unknown as MutationObserver,
          ),
        get target(): Node | null {
          return self.target;
        },
        get options(): MutationObserverInit | null {
          return self.options;
        },
      };
    }
  }
  vi.stubGlobal('MutationObserver', FakeMO);
}

function makeSection(el: HTMLElement, index: number): Section {
  return {
    index,
    anchor: null,
    element: el,
    slides: [],
    isActive: index === 0,
  };
}

function makeInstance(
  sectionEls: HTMLElement[],
  selector = '.section',
): { instance: SnapdeckInstance; refresh: ReturnType<typeof vi.fn> } {
  const refresh = vi.fn();
  const sections = sectionEls.map((el, i) => makeSection(el, i));
  const state = {
    sections,
    slides: [],
    activeSectionIndex: 0,
    isAnimating: false,
    canScroll: true,
    isResponsive: false,
    width: 0,
    height: 0,
    scrollY: 0,
    scrollX: 0,
    activeSlidePerSection: [],
  };
  const instance = {
    state,
    activeSection: sections[0] ?? null,
    activeSlide: null,
    moveTo: vi.fn(),
    moveUp: vi.fn(),
    moveDown: vi.fn(),
    moveSlideLeft: vi.fn(),
    moveSlideRight: vi.fn(),
    silentMoveTo: vi.fn(),
    on: vi.fn(),
    setOption: vi.fn(),
    getOption: vi.fn((key: string) => {
      if (key === 'sectionSelector') return selector;
      return undefined;
    }),
    refresh,
    destroy: vi.fn(),
  } as unknown as SnapdeckInstance;
  return { instance, refresh };
}

function mountContainer(count: number): {
  container: HTMLElement;
  sections: HTMLElement[];
} {
  const container = document.createElement('div');
  container.className = 'snapdeck';
  const sections: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'section';
    container.appendChild(s);
    sections.push(s);
  }
  document.body.appendChild(container);
  return { container, sections };
}

function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

function nodeList(nodes: Node[]): NodeList {
  return {
    length: nodes.length,
    item(i: number): Node | null {
      return nodes[i] ?? null;
    },
    forEach(cb: (n: Node) => void) {
      nodes.forEach(cb);
    },
    [Symbol.iterator]: function* () {
      for (const n of nodes) yield n;
    },
  } as unknown as NodeList;
}

function record(added: Node[], removed: Node[] = []): MoRecordLike {
  return {
    type: 'childList',
    addedNodes: nodeList(added),
    removedNodes: nodeList(removed),
  };
}

describe('observer plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installMoStub();
    lastMo = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearBody();
  });

  it('attaches observer to the first section parentElement with narrow config', () => {
    const { container, sections } = mountContainer(2);
    const { instance } = makeInstance(sections);

    const p = observer();
    p.install(instance);

    expect(lastMo).not.toBeNull();
    expect(lastMo!.observe).toHaveBeenCalledTimes(1);
    expect(lastMo!.target).toBe(container);
    expect(lastMo!.options).toEqual({ childList: true, subtree: false });

    p.destroy();
  });

  it('fires refresh() after debounceMs when a matching section is added', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);

    const p = observer({ debounceMs: 100 });
    p.install(instance);

    const newSection = document.createElement('div');
    newSection.className = 'section';
    lastMo!.fire([record([newSection])]);

    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    p.destroy();
  });

  it('debounces multiple rapid mutations to a single refresh() call', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);

    const p = observer({ debounceMs: 50 });
    p.install(instance);

    const a = document.createElement('div');
    a.className = 'section';
    const b = document.createElement('div');
    b.className = 'section';
    const c = document.createElement('div');
    c.className = 'section';

    lastMo!.fire([record([a])]);
    vi.advanceTimersByTime(20);
    lastMo!.fire([record([b])]);
    vi.advanceTimersByTime(20);
    lastMo!.fire([record([c])]);
    vi.advanceTimersByTime(49);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    p.destroy();
  });

  it('ignores mutations whose nodes do not match the section selector', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);

    const p = observer({ debounceMs: 10 });
    p.install(instance);

    const unrelated = document.createElement('span');
    unrelated.className = 'decoration';
    lastMo!.fire([record([unrelated])]);

    vi.advanceTimersByTime(1000);
    expect(refresh).not.toHaveBeenCalled();

    p.destroy();
  });

  it('destroy() disconnects the observer and clears pending debounce timer', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);

    const p = observer({ debounceMs: 100 });
    p.install(instance);

    const added = document.createElement('div');
    added.className = 'section';
    lastMo!.fire([record([added])]);
    const disconnect = lastMo!.disconnect;

    p.destroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('destroy() is idempotent', () => {
    const { sections } = mountContainer(1);
    const { instance } = makeInstance(sections);

    const p = observer();
    p.install(instance);
    const disconnect = lastMo!.disconnect;

    expect(() => {
      p.destroy();
      p.destroy();
    }).not.toThrow();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('no-op install and destroy when MutationObserver is missing', () => {
    vi.stubGlobal('MutationObserver', undefined);
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);

    const p = observer();
    expect(() => p.install(instance)).not.toThrow();
    expect(() => p.destroy()).not.toThrow();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('is a no-op when there are zero sections at install time', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { instance } = makeInstance([]);

    const p = observer();
    expect(() => p.install(instance)).not.toThrow();
    expect(lastMo).toBeNull();
    p.destroy();
  });

  it('uses the sectionSelector option override when provided', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(
      sections,
      '.ignored-core-selector',
    );

    const p = observer({ debounceMs: 10, sectionSelector: '.custom' });
    p.install(instance);

    const mismatch = document.createElement('div');
    mismatch.className = 'ignored-core-selector';
    lastMo!.fire([record([mismatch])]);
    vi.advanceTimersByTime(100);
    expect(refresh).not.toHaveBeenCalled();

    const match = document.createElement('div');
    match.className = 'custom';
    lastMo!.fire([record([match])]);
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(1);

    p.destroy();
  });

  it('treats removed section nodes as relevant mutations', () => {
    const { sections } = mountContainer(2);
    const { instance, refresh } = makeInstance(sections);

    const p = observer({ debounceMs: 10 });
    p.install(instance);

    const removed = sections[1]!;
    lastMo!.fire([record([], [removed])]);
    vi.advanceTimersByTime(10);
    expect(refresh).toHaveBeenCalledTimes(1);

    p.destroy();
  });

  it('swallows errors thrown by refresh() and logs them', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);
    refresh.mockImplementation(() => {
      throw new Error('boom');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const p = observer({ debounceMs: 5 });
    p.install(instance);

    const added = document.createElement('div');
    added.className = 'section';
    lastMo!.fire([record([added])]);
    expect(() => vi.advanceTimersByTime(10)).not.toThrow();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalled();

    p.destroy();
    spy.mockRestore();
  });

  it('ignores non-childList mutation records', () => {
    const { sections } = mountContainer(1);
    const { instance, refresh } = makeInstance(sections);

    const p = observer({ debounceMs: 10 });
    p.install(instance);

    const added = document.createElement('div');
    added.className = 'section';
    lastMo!.fire([
      {
        type: 'attributes',
        addedNodes: nodeList([added]),
        removedNodes: nodeList([]),
      } as unknown as MutationRecord,
    ]);
    vi.advanceTimersByTime(100);
    expect(refresh).not.toHaveBeenCalled();

    p.destroy();
  });
});
