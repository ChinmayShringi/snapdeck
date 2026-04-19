/**
 * Audit notes
 * -----------
 * Scope: @snapdeck/plugin-progress-bar behavioral tests.
 *
 * What is exercised:
 *   - install mounts a root + fill element under document.body.
 *   - thickness + color options are written as CSS custom properties only
 *     (no inline width/height/background assignments).
 *   - afterLoad / afterRender / afterRebuild listeners update
 *     --snapdeck-progress-value to (activeSectionIndex + 1) / total.
 *   - destroy removes the element and unsubscribes every listener.
 *   - repeated install/destroy cycles are idempotent and leak-free.
 *
 * Rationale:
 *   A minimal SnapdeckInstance mock avoids pulling core internals into the
 *   plugin test surface. Each emitted event is exposed via an emit(name, ...)
 *   helper so tests can simulate lifecycle events deterministically.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnapdeckInstance, SnapdeckEventName, SnapdeckEvents } from '@snapdeck/core';
import { progressBar } from '../src/plugin.js';

type Handler = (...args: unknown[]) => unknown;

interface MockInstance extends SnapdeckInstance {
  emit<K extends SnapdeckEventName>(
    event: K,
    ...args: Parameters<SnapdeckEvents[K]>
  ): void;
  setActive(index: number): void;
  setTotal(total: number): void;
  handlerCount(): number;
}

const makeInstance = (total: number, active = 0): MockInstance => {
  const handlers = new Map<string, Set<Handler>>();
  let activeIdx = active;
  let sectionCount = total;

  const mkSections = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      index: i,
      anchor: null,
      element: document.createElement('div'),
      slides: [],
      isActive: i === activeIdx,
    }));

  const instance = {
    get state() {
      return {
        sections: mkSections(sectionCount),
        slides: [],
        activeSectionIndex: activeIdx,
        isAnimating: false,
        canScroll: true,
        isResponsive: false,
        width: 1024,
        height: 768,
        scrollY: 0,
        scrollX: 0,
        activeSlidePerSection: [],
      };
    },
    activeSection: null,
    activeSlide: null,
    moveTo: vi.fn(async () => {}),
    moveUp: vi.fn(async () => {}),
    moveDown: vi.fn(async () => {}),
    moveSlideLeft: vi.fn(async () => {}),
    moveSlideRight: vi.fn(async () => {}),
    silentMoveTo: vi.fn(),
    setOption: vi.fn(),
    getOption: vi.fn(),
    refresh: vi.fn(),
    destroy: vi.fn(),
    on: (event: string, handler: Handler) => {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler);
      return () => {
        set!.delete(handler);
      };
    },
    emit: (event: string, ...args: unknown[]) => {
      const set = handlers.get(event);
      if (!set) return;
      for (const h of set) h(...args);
    },
    setActive: (i: number) => {
      activeIdx = i;
    },
    setTotal: (t: number) => {
      sectionCount = t;
    },
    handlerCount: () => {
      let n = 0;
      for (const s of handlers.values()) n += s.size;
      return n;
    },
  };

  return instance as unknown as MockInstance;
};

const getBar = (): HTMLDivElement | null =>
  document.body.querySelector<HTMLDivElement>('.snapdeck-progress-bar');

const getVar = (el: HTMLElement, name: string): string =>
  el.style.getPropertyValue(name);

const clearBody = (): void => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
};

beforeEach(() => {
  clearBody();
});

describe('progressBar()', () => {
  it('install creates a bar with a fill child attached to document.body', () => {
    const plugin = progressBar();
    plugin.install(makeInstance(4));
    const bar = getBar();
    expect(bar).not.toBeNull();
    expect(bar!.parentElement).toBe(document.body);
    const fill = bar!.querySelector('.snapdeck-progress-bar__fill');
    expect(fill).not.toBeNull();
    plugin.destroy();
  });

  it('applies thickness as a CSS custom property only', () => {
    const plugin = progressBar({ thickness: '7px' });
    plugin.install(makeInstance(3));
    const bar = getBar()!;
    expect(getVar(bar, '--snapdeck-progress-thickness')).toBe('7px');
    expect(bar.style.height).toBe('');
    expect(bar.style.width).toBe('');
    expect(bar.style.background).toBe('');
    plugin.destroy();
  });

  it('defaults thickness to 3px and position to top', () => {
    const plugin = progressBar();
    plugin.install(makeInstance(2));
    const bar = getBar()!;
    expect(getVar(bar, '--snapdeck-progress-thickness')).toBe('3px');
    expect(bar.getAttribute('data-position')).toBe('top');
    plugin.destroy();
  });

  it('honors position=bottom and extra className + color + showPerSection', () => {
    const plugin = progressBar({
      position: 'bottom',
      color: 'hotpink',
      className: 'my-bar',
      showPerSection: true,
    });
    plugin.install(makeInstance(2));
    const bar = getBar()!;
    expect(bar.getAttribute('data-position')).toBe('bottom');
    expect(bar.classList.contains('my-bar')).toBe(true);
    expect(getVar(bar, '--snapdeck-progress-color')).toBe('hotpink');
    expect(bar.getAttribute('data-per-section')).toBe('true');
    plugin.destroy();
  });

  it('initial --snapdeck-progress-value reflects (active+1)/total on install', () => {
    const plugin = progressBar();
    const inst = makeInstance(5, 1);
    plugin.install(inst);
    const bar = getBar()!;
    expect(getVar(bar, '--snapdeck-progress-value')).toBe(String(2 / 5));
    plugin.destroy();
  });

  it('updates the custom property on afterLoad', () => {
    const plugin = progressBar();
    const inst = makeInstance(4, 0);
    plugin.install(inst);
    const bar = getBar()!;
    inst.setActive(2);
    inst.emit('afterLoad', {
      origin: inst.state.sections[0]!,
      destination: inst.state.sections[2]!,
      direction: 'down',
      trigger: 'api',
    });
    expect(getVar(bar, '--snapdeck-progress-value')).toBe(String(3 / 4));
    plugin.destroy();
  });

  it('updates on afterRender as well', () => {
    const plugin = progressBar();
    const inst = makeInstance(10, 4);
    plugin.install(inst);
    const bar = getBar()!;
    inst.setActive(9);
    inst.emit('afterRender', { activeSection: inst.state.sections[9]! });
    expect(getVar(bar, '--snapdeck-progress-value')).toBe('1');
    plugin.destroy();
  });

  it('re-reads total sections on afterRebuild', () => {
    const plugin = progressBar();
    const inst = makeInstance(2, 1);
    plugin.install(inst);
    const bar = getBar()!;
    expect(getVar(bar, '--snapdeck-progress-value')).toBe('1');
    inst.setTotal(4);
    inst.setActive(1);
    inst.emit('afterRebuild');
    expect(getVar(bar, '--snapdeck-progress-value')).toBe(String(2 / 4));
    plugin.destroy();
  });

  it('handles 0-section edge case without throwing', () => {
    const plugin = progressBar();
    const inst = makeInstance(0, -1);
    plugin.install(inst);
    const bar = getBar()!;
    expect(getVar(bar, '--snapdeck-progress-value')).toBe('0');
    plugin.destroy();
  });

  it('clamps negative activeSectionIndex to 0', () => {
    const plugin = progressBar();
    const inst = makeInstance(4, -1);
    plugin.install(inst);
    const bar = getBar()!;
    expect(getVar(bar, '--snapdeck-progress-value')).toBe(String(1 / 4));
    plugin.destroy();
  });

  it('destroy removes the element', () => {
    const plugin = progressBar();
    plugin.install(makeInstance(3));
    expect(getBar()).not.toBeNull();
    plugin.destroy();
    expect(getBar()).toBeNull();
  });

  it('destroy unsubscribes all listeners', () => {
    const plugin = progressBar();
    const inst = makeInstance(3);
    plugin.install(inst);
    expect(inst.handlerCount()).toBe(3);
    plugin.destroy();
    expect(inst.handlerCount()).toBe(0);
  });

  it('supports multiple install/destroy cycles', () => {
    const plugin = progressBar({ thickness: '5px' });
    const inst = makeInstance(4);
    for (let i = 0; i < 3; i++) {
      plugin.install(inst);
      expect(getBar()).not.toBeNull();
      plugin.destroy();
      expect(getBar()).toBeNull();
      expect(inst.handlerCount()).toBe(0);
    }
  });

  it('destroy is safe when an unsubscribe throws', () => {
    const plugin = progressBar();
    const inst = makeInstance(2);
    const originalOn = inst.on.bind(inst);
    let first = true;
    (inst as unknown as { on: SnapdeckInstance['on'] }).on = ((
      event: SnapdeckEventName,
      handler: SnapdeckEvents[SnapdeckEventName],
    ) => {
      const off = originalOn(event, handler);
      if (first) {
        first = false;
        return () => {
          throw new Error('boom');
        };
      }
      return off;
    }) as SnapdeckInstance['on'];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    plugin.install(inst);
    expect(() => plugin.destroy()).not.toThrow();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('exposes plugin name "progress-bar"', () => {
    const plugin = progressBar();
    expect(plugin.name).toBe('progress-bar');
  });
});
