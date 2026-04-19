/**
 * Audit notes — @snapdeck/plugin-nav-dots
 *
 * Scope: unit tests exercise the plugin against a hand-rolled mock of
 * SnapdeckInstance. We intentionally avoid importing runtime code from
 * @snapdeck/core; the plugin only needs a structural subset of the
 * interface, so a mock keeps the tests fast and isolated. The mock is
 * typed against the real `@snapdeck/core` types (type-only import) so the
 * plugin's public contract stays honest.
 *
 * Invariants covered:
 *   - install() renders exactly state.sections.length buttons in the nav.
 *   - Button clicks call instance.moveTo(index).
 *   - afterLoad handler updates aria-current without a full rebuild.
 *   - afterRebuild re-renders the DOM (new section count reflected).
 *   - destroy() removes the nav from the DOM and invokes every unsubscribe.
 *   - position option is reflected on the nav via class + data attribute.
 *   - install/destroy can cycle multiple times without leaking DOM.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Section,
  SnapdeckEventName,
  SnapdeckEvents,
  SnapdeckInstance,
  SnapdeckOptions,
  SnapdeckState,
  Unsubscribe,
} from '@snapdeck/core';

import { navDots } from '../src/plugin.js';

function makeSection(index: number, anchor: string | null): Section {
  const element = document.createElement('section');
  return {
    index,
    anchor,
    element,
    slides: [],
    isActive: false,
  };
}

interface MockInstance extends SnapdeckInstance {
  setActive(index: number): void;
  setSections(sections: Section[]): void;
  fire<K extends SnapdeckEventName>(event: K, payload: unknown): void;
  unsubCount(): number;
  activeUnsubCount(): number;
  moveToSpy: ReturnType<typeof vi.fn>;
}

function createMockInstance(sectionCount: number): MockInstance {
  let sections: Section[] = Array.from({ length: sectionCount }, (_, i) =>
    makeSection(i, i === 0 ? 'home' : null),
  );
  let activeSectionIndex = 0;

  const handlers = new Map<SnapdeckEventName, Set<(payload: unknown) => void>>();
  let totalSubs = 0;
  let activeSubs = 0;

  const state: SnapdeckState = {
    get sections() {
      return sections;
    },
    slides: [],
    get activeSectionIndex() {
      return activeSectionIndex;
    },
    isAnimating: false,
    canScroll: true,
    isResponsive: false,
    width: 1024,
    height: 768,
    scrollY: 0,
    scrollX: 0,
    activeSlidePerSection: [],
  } as unknown as SnapdeckState;

  const moveToSpy = vi.fn(async (_target: number | string) => {
    // no-op async
  });

  const instance: MockInstance = {
    get state() {
      return state;
    },
    get activeSection() {
      return sections[activeSectionIndex] ?? null;
    },
    activeSlide: null,
    moveTo: moveToSpy as unknown as SnapdeckInstance['moveTo'],
    moveUp: async () => {},
    moveDown: async () => {},
    moveSlideLeft: async () => {},
    moveSlideRight: async () => {},
    silentMoveTo: () => {},
    on<K extends SnapdeckEventName>(event: K, handler: SnapdeckEvents[K]): Unsubscribe {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      const wrapper = handler as unknown as (payload: unknown) => void;
      set.add(wrapper);
      totalSubs += 1;
      activeSubs += 1;
      return () => {
        const current = handlers.get(event);
        if (current && current.delete(wrapper)) {
          activeSubs -= 1;
        }
      };
    },
    setOption: () => {},
    getOption: <K extends keyof SnapdeckOptions>(_key: K) => undefined as unknown as SnapdeckOptions[K],
    refresh: () => {},
    destroy: () => {},
    setActive(index: number) {
      activeSectionIndex = index;
    },
    setSections(next: Section[]) {
      sections = next;
    },
    fire<K extends SnapdeckEventName>(event: K, payload: unknown) {
      const set = handlers.get(event);
      if (!set) return;
      for (const fn of Array.from(set)) fn(payload);
    },
    unsubCount() {
      return totalSubs;
    },
    activeUnsubCount() {
      return activeSubs;
    },
    moveToSpy,
  };

  return instance;
}

function resetBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

afterEach(() => {
  resetBody();
});

describe('navDots plugin', () => {
  it('creates nav element with one button per section', () => {
    const instance = createMockInstance(3);
    const plugin = navDots();
    plugin.install(instance);

    const nav = document.querySelector('nav.snapdeck-nav-dots');
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute('aria-label')).toBe('Snapdeck navigation');
    const buttons = nav?.querySelectorAll('button.snapdeck-nav-dots__button');
    expect(buttons?.length).toBe(3);
    expect(buttons?.[0]?.getAttribute('aria-label')).toBe('home');
    expect(buttons?.[1]?.getAttribute('aria-label')).toBe('Section 2');
    plugin.destroy();
  });

  it('clicking a button invokes moveTo(index)', () => {
    const instance = createMockInstance(3);
    const plugin = navDots();
    plugin.install(instance);

    const btns = document.querySelectorAll<HTMLButtonElement>('button.snapdeck-nav-dots__button');
    btns[2]?.click();
    expect(instance.moveToSpy).toHaveBeenCalledWith(2);
    plugin.destroy();
  });

  it('aria-current updates on afterLoad', () => {
    const instance = createMockInstance(3);
    const plugin = navDots();
    plugin.install(instance);

    const btns = document.querySelectorAll<HTMLButtonElement>('button.snapdeck-nav-dots__button');
    expect(btns[0]?.getAttribute('aria-current')).toBe('true');
    expect(btns[1]?.hasAttribute('aria-current')).toBe(false);

    instance.setActive(1);
    instance.fire('afterLoad', {});

    expect(btns[0]?.hasAttribute('aria-current')).toBe(false);
    expect(btns[1]?.getAttribute('aria-current')).toBe('true');
    expect(btns[1]?.classList.contains('is-active')).toBe(true);
    plugin.destroy();
  });

  it('afterRender also updates active state', () => {
    const instance = createMockInstance(2);
    const plugin = navDots();
    plugin.install(instance);

    instance.setActive(1);
    instance.fire('afterRender', { activeSection: null });
    const btns = document.querySelectorAll<HTMLButtonElement>('button.snapdeck-nav-dots__button');
    expect(btns[1]?.getAttribute('aria-current')).toBe('true');
    plugin.destroy();
  });

  it('afterRebuild re-renders the list with new sections', () => {
    const instance = createMockInstance(2);
    const plugin = navDots();
    plugin.install(instance);

    expect(document.querySelectorAll('button.snapdeck-nav-dots__button').length).toBe(2);

    instance.setSections([
      makeSection(0, 'a'),
      makeSection(1, 'b'),
      makeSection(2, 'c'),
      makeSection(3, 'd'),
    ]);
    instance.fire('afterRebuild', undefined);

    expect(document.querySelectorAll('nav.snapdeck-nav-dots').length).toBe(1);
    expect(document.querySelectorAll('button.snapdeck-nav-dots__button').length).toBe(4);
    plugin.destroy();
  });

  it('destroy removes nav from DOM and unsubscribes all handlers', () => {
    const instance = createMockInstance(2);
    const plugin = navDots();
    plugin.install(instance);

    expect(instance.unsubCount()).toBe(3);
    expect(instance.activeUnsubCount()).toBe(3);
    expect(document.querySelector('nav.snapdeck-nav-dots')).toBeTruthy();

    plugin.destroy();

    expect(document.querySelector('nav.snapdeck-nav-dots')).toBeNull();
    expect(instance.activeUnsubCount()).toBe(0);
  });

  it("position: 'left' is reflected in class and data attribute", () => {
    const instance = createMockInstance(2);
    const plugin = navDots({ position: 'left' });
    plugin.install(instance);

    const nav = document.querySelector<HTMLElement>('nav.snapdeck-nav-dots');
    expect(nav?.classList.contains('snapdeck-nav-dots--left')).toBe(true);
    expect(nav?.classList.contains('snapdeck-nav-dots--right')).toBe(false);
    expect(nav?.dataset.position).toBe('left');
    plugin.destroy();
  });

  it("position: 'right' (default) is reflected in class and data attribute", () => {
    const instance = createMockInstance(2);
    const plugin = navDots();
    plugin.install(instance);

    const nav = document.querySelector<HTMLElement>('nav.snapdeck-nav-dots');
    expect(nav?.classList.contains('snapdeck-nav-dots--right')).toBe(true);
    expect(nav?.dataset.position).toBe('right');
    plugin.destroy();
  });

  it('tooltips option renders a tooltip span inside each button', () => {
    const instance = createMockInstance(2);
    const plugin = navDots({ tooltips: true });
    plugin.install(instance);

    const tips = document.querySelectorAll('.snapdeck-nav-dots__tooltip');
    expect(tips.length).toBe(2);
    expect(tips[0]?.textContent).toBe('home');
    plugin.destroy();
  });

  it('showActiveLabel renders a label element that tracks active section', () => {
    const instance = createMockInstance(2);
    const plugin = navDots({ showActiveLabel: true });
    plugin.install(instance);

    const label = document.querySelector('.snapdeck-nav-dots__active-label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('home');

    instance.setActive(1);
    instance.fire('afterLoad', {});
    expect(label?.textContent).toBe('Section 2');
    plugin.destroy();
  });

  it('className option appends extra classes to the nav', () => {
    const instance = createMockInstance(1);
    const plugin = navDots({ className: 'custom-a custom-b' });
    plugin.install(instance);

    const nav = document.querySelector<HTMLElement>('nav.snapdeck-nav-dots');
    expect(nav?.classList.contains('custom-a')).toBe(true);
    expect(nav?.classList.contains('custom-b')).toBe(true);
    plugin.destroy();
  });

  it('supports multiple install/destroy cycles without leaks', () => {
    const instance = createMockInstance(2);
    const plugin = navDots();

    for (let i = 0; i < 3; i += 1) {
      plugin.install(instance);
      expect(document.querySelectorAll('nav.snapdeck-nav-dots').length).toBe(1);
      plugin.destroy();
      expect(document.querySelectorAll('nav.snapdeck-nav-dots').length).toBe(0);
    }

    expect(instance.activeUnsubCount()).toBe(0);
  });

  it('clicks after destroy do not call moveTo', () => {
    const instance = createMockInstance(2);
    const plugin = navDots();
    plugin.install(instance);
    const btn = document.querySelector<HTMLButtonElement>('button.snapdeck-nav-dots__button');
    plugin.destroy();
    // button is detached; clicking shouldn't throw or call moveTo
    btn?.click();
    expect(instance.moveToSpy).not.toHaveBeenCalled();
  });
});
