/**
 * Audit notes (Role 2):
 *
 * - The plugin mutates DOM attributes in-place on media elements (`data-src` ->
 *   `src`). This is not "state" mutation in the immutable-options sense; it is
 *   the intended effect. The plugin itself never mutates the Section objects,
 *   the state, or the options object.
 * - Idempotency: once `data-src` is gone the element is skipped on re-entry, so
 *   `afterLoad` bouncing back to a previously loaded section is a no-op.
 * - `destroy()` intentionally leaves any already-transferred `src` values in
 *   place; restoring would re-trigger network loads if the plugin is re-added.
 * - Tests build DOM via individual createElement/setAttribute calls to avoid
 *   innerHTML (which trips the security lint hook even for test fixtures).
 * - Coverage target: >=85% lines/statements/functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  NavigationPayload,
  Section,
  SnapdeckEventName,
  SnapdeckEvents,
  SnapdeckInstance,
  SnapdeckState,
  Unsubscribe,
} from '@snapdeck/core';
import { lazyMedia } from '../src/plugin.js';

type AfterLoadHandler = SnapdeckEvents['afterLoad'];

interface MockInstance {
  readonly instance: SnapdeckInstance;
  emitAfterLoad: (destinationIndex: number) => void;
  afterLoadHandlerCount: () => number;
}

interface AttrSpec {
  readonly [key: string]: string;
}

function el(tag: string, attrs: AttrSpec = {}): HTMLElement {
  const node = document.createElement(tag);
  for (const key of Object.keys(attrs)) {
    node.setAttribute(key, attrs[key] as string);
  }
  return node;
}

function makeSectionWith(index: number, children: ReadonlyArray<HTMLElement>): Section {
  const root = document.createElement('section');
  for (const child of children) root.appendChild(child);
  return {
    index,
    anchor: null,
    element: root,
    slides: [],
    isActive: false,
  };
}

function lazyImg(id: string): HTMLElement {
  return el('img', { id, 'data-src': `/img/${id}.png` });
}

function makeInstance(sections: ReadonlyArray<Section>, activeIndex = 0): MockInstance {
  const handlers: Record<string, Set<(p: unknown) => void>> = {};
  let currentActive = activeIndex;

  const state: SnapdeckState = {
    sections,
    slides: [],
    get activeSectionIndex() {
      return currentActive;
    },
    isAnimating: false,
    canScroll: true,
    isResponsive: false,
    width: 1024,
    height: 768,
    scrollY: 0,
    scrollX: 0,
    activeSlidePerSection: sections.map(() => 0),
  } as unknown as SnapdeckState;

  const instance = {
    state,
    activeSection: sections[currentActive] ?? null,
    activeSlide: null,
    on<K extends SnapdeckEventName>(event: K, handler: SnapdeckEvents[K]): Unsubscribe {
      const set = handlers[event] ?? new Set();
      handlers[event] = set;
      set.add(handler as (p: unknown) => void);
      return () => {
        set.delete(handler as (p: unknown) => void);
      };
    },
  } as unknown as SnapdeckInstance;

  return {
    instance,
    emitAfterLoad(destinationIndex: number) {
      const dest = sections[destinationIndex];
      if (!dest) throw new Error(`no section at ${destinationIndex}`);
      const origin = sections[currentActive] ?? dest;
      const payload: NavigationPayload = {
        origin,
        destination: dest,
        direction: 'down',
        trigger: 'api',
      };
      currentActive = destinationIndex;
      const set = handlers['afterLoad'];
      if (set) {
        for (const fn of set) (fn as AfterLoadHandler)(payload);
      }
    },
    afterLoadHandlerCount() {
      return handlers['afterLoad']?.size ?? 0;
    },
  };
}

describe('lazyMedia plugin', () => {
  let sections: Section[];

  beforeEach(() => {
    sections = [
      makeSectionWith(0, [lazyImg('a')]),
      makeSectionWith(1, [lazyImg('b')]),
      makeSectionWith(2, [lazyImg('c')]),
      makeSectionWith(3, [lazyImg('d')]),
      makeSectionWith(4, [lazyImg('e')]),
    ];
  });

  it('has the expected plugin name', () => {
    expect(lazyMedia().name).toBe('lazy-media');
  });

  it('loads media in the active section on install', () => {
    const m = makeInstance(sections, 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);

    const img = sections[0]!.element.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/img/a.png');
    expect(img.hasAttribute('data-src')).toBe(false);
    expect(sections[1]!.element.querySelector('img')!.getAttribute('src')).toBeNull();
  });

  it('loads adjacent sections with default eagerAdjacent=1', () => {
    const m = makeInstance(sections, 2);
    lazyMedia().install(m.instance);

    expect(sections[1]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/b.png');
    expect(sections[2]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/c.png');
    expect(sections[3]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/d.png');
    expect(sections[0]!.element.querySelector('img')!.getAttribute('src')).toBeNull();
    expect(sections[4]!.element.querySelector('img')!.getAttribute('src')).toBeNull();
  });

  it('loads destination + neighbors on afterLoad', () => {
    const m = makeInstance(sections, 0);
    lazyMedia().install(m.instance);

    m.emitAfterLoad(3);

    expect(sections[2]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/c.png');
    expect(sections[3]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/d.png');
    expect(sections[4]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/e.png');
  });

  it('is idempotent: already-loaded img stays untouched', () => {
    const m = makeInstance(sections, 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);

    const img = sections[0]!.element.querySelector('img')!;
    img.setAttribute('src', '/manually-set.png');

    m.emitAfterLoad(0);
    expect(img.getAttribute('src')).toBe('/manually-set.png');
  });

  it('transfers data-srcset to srcset when present', () => {
    const img = el('img', {
      'data-src': '/x.png',
      'data-srcset': '/x@1x.png 1x, /x@2x.png 2x',
    });
    const section = makeSectionWith(0, [img]);
    const m = makeInstance([section], 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);

    expect(img.getAttribute('src')).toBe('/x.png');
    expect(img.getAttribute('srcset')).toBe('/x@1x.png 1x, /x@2x.png 2x');
    expect(img.hasAttribute('data-srcset')).toBe(false);
  });

  it('transfers data-poster to poster on video', () => {
    const video = el('video', { 'data-src': '/v.mp4', 'data-poster': '/v-poster.jpg' });
    const section = makeSectionWith(0, [video]);
    const m = makeInstance([section], 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);

    expect(video.getAttribute('src')).toBe('/v.mp4');
    expect(video.getAttribute('poster')).toBe('/v-poster.jpg');
    expect(video.hasAttribute('data-poster')).toBe(false);
  });

  it('transfers data-src on iframe', () => {
    const iframe = el('iframe', { 'data-src': '/embed' });
    const section = makeSectionWith(0, [iframe]);
    const m = makeInstance([section], 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);
    expect(iframe.getAttribute('src')).toBe('/embed');
  });

  it('destroy stops future afterLoad hydration', () => {
    const m = makeInstance(sections, 0);
    const plugin = lazyMedia({ eagerAdjacent: 0 });
    plugin.install(m.instance);
    expect(m.afterLoadHandlerCount()).toBe(1);

    plugin.destroy();
    expect(m.afterLoadHandlerCount()).toBe(0);

    m.emitAfterLoad(3);
    expect(sections[3]!.element.querySelector('img')!.getAttribute('src')).toBeNull();
  });

  it('destroy is idempotent', () => {
    const m = makeInstance(sections, 0);
    const plugin = lazyMedia();
    plugin.install(m.instance);
    plugin.destroy();
    expect(() => plugin.destroy()).not.toThrow();
  });

  it('respects custom attribute option', () => {
    const img = el('img', { 'data-lazy-src': '/c.png' });
    const section = makeSectionWith(0, [img]);
    const m = makeInstance([section], 0);
    lazyMedia({ attribute: 'data-lazy-src', eagerAdjacent: 0 }).install(m.instance);

    expect(img.getAttribute('src')).toBe('/c.png');
    expect(img.hasAttribute('data-lazy-src')).toBe(false);
  });

  it('respects custom mediaSelectors option', () => {
    const img = el('img', { 'data-src': '/a.png' });
    const bg = el('div', { class: 'bg', 'data-src': '/bg.png' });
    const section = makeSectionWith(0, [img, bg]);
    const m = makeInstance([section], 0);
    lazyMedia({ mediaSelectors: ['div.bg'], eagerAdjacent: 0 }).install(m.instance);

    expect(img.getAttribute('src')).toBeNull();
    expect(bg.getAttribute('src')).toBe('/bg.png');
  });

  it('eagerSections=0 + eagerAdjacent=0 loads nothing at init', () => {
    const m = makeInstance(sections, 2);
    lazyMedia({ eagerSections: 0, eagerAdjacent: 0 }).install(m.instance);
    for (const s of sections) {
      expect(s.element.querySelector('img')!.getAttribute('src')).toBeNull();
    }
  });

  it('clamps at list boundaries', () => {
    const m = makeInstance(sections, 0);
    lazyMedia({ eagerAdjacent: 2 }).install(m.instance);
    expect(sections[0]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/a.png');
    expect(sections[1]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/b.png');
    expect(sections[2]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/c.png');
    expect(sections[3]!.element.querySelector('img')!.getAttribute('src')).toBeNull();
  });

  it('handles empty sections array gracefully', () => {
    const m = makeInstance([], 0);
    expect(() => lazyMedia().install(m.instance)).not.toThrow();
  });

  it('leaves elements without data-src alone', () => {
    const img = el('img', { src: '/already.png' });
    const section = makeSectionWith(0, [img]);
    const m = makeInstance([section], 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);
    expect(img.getAttribute('src')).toBe('/already.png');
  });

  it('handles sequential afterLoad transitions', () => {
    const m = makeInstance(sections, 0);
    lazyMedia({ eagerAdjacent: 0 }).install(m.instance);
    m.emitAfterLoad(1);
    m.emitAfterLoad(4);
    expect(sections[1]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/b.png');
    expect(sections[4]!.element.querySelector('img')!.getAttribute('src')).toBe('/img/e.png');
  });

  it('vi.fn smoke sanity', () => {
    const spy = vi.fn();
    spy('x');
    expect(spy).toHaveBeenCalledWith('x');
  });
});
