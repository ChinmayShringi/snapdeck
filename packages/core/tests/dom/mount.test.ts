/**
 * Audit notes (Role 2):
 *  - Verifies the DOM mount contract on happy-dom:
 *    * resolveContainer accepts selector strings and HTMLElements, and throws
 *      descriptively on missing/invalid inputs.
 *    * mountStructure tags container/sections/slides, wraps slides under a
 *      track, skips the track when a section has no slides, parses anchors and
 *      indices, and marks the first section active at mount time.
 *    * teardown is idempotent, fully reverses class mutations, and restores
 *      slide order without affecting unrelated attributes/classes on user
 *      elements.
 *  - Fixture DOM is built programmatically (createElement + appendChild) to
 *    avoid innerHTML; the assertions still operate on real happy-dom nodes.
 *  - Coverage target: >=90% lines on src/dom/**.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS } from '../../src/options/defaults.js';
import {
  CLS,
  mountStructure,
  resolveContainer,
} from '../../src/dom/index.js';
import type { SnapdeckOptions } from '../../src/types.js';

function makeOptions(overrides: Partial<SnapdeckOptions> = {}): SnapdeckOptions {
  return { ...DEFAULT_OPTIONS, ...overrides };
}

function makeSlide(label: string, anchor: string | null, extraClass?: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-snapdeck-slide', '');
  if (anchor !== null) el.setAttribute('data-anchor', anchor);
  if (extraClass) el.classList.add(extraClass);
  el.textContent = label;
  return el;
}

function makeSection(
  anchor: string | null,
  extraClass: string | null,
  slides: ReadonlyArray<HTMLElement>,
  extraChild?: HTMLElement,
): HTMLElement {
  const el = document.createElement('section');
  el.setAttribute('data-snapdeck-section', '');
  if (anchor !== null) el.setAttribute('data-anchor', anchor);
  if (extraClass) el.classList.add(extraClass);
  if (extraChild) el.appendChild(extraChild);
  for (const s of slides) el.appendChild(s);
  return el;
}

function buildFixture(): HTMLElement {
  // Reset
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  const root = document.createElement('div');
  root.id = 'app';
  root.classList.add('user-class');
  root.setAttribute('data-user', 'keep');

  const intro = document.createElement('p');
  intro.textContent = 'intro';

  const s1 = makeSection('home', 'hero', [], intro);
  const s2 = makeSection('gallery', null, [
    makeSlide('A', 'a', 'slide-a'),
    makeSlide('B', 'b'),
    makeSlide('C', null),
  ]);
  const empty = document.createElement('div');
  empty.textContent = 'no slides here';
  const s3 = makeSection(null, null, [], empty);

  root.appendChild(s1);
  root.appendChild(s2);
  root.appendChild(s3);
  document.body.appendChild(root);
  return root;
}

describe('resolveContainer', () => {
  beforeEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  });

  it('accepts a CSS selector string', () => {
    const main = document.createElement('main');
    main.id = 'root';
    document.body.appendChild(main);
    const el = resolveContainer('#root');
    expect(el.id).toBe('root');
  });

  it('accepts an HTMLElement', () => {
    const el = document.createElement('div');
    expect(resolveContainer(el)).toBe(el);
  });

  it('throws when selector matches nothing', () => {
    expect(() => resolveContainer('#missing')).toThrow(/no element matches/);
  });

  it('throws on empty selector', () => {
    expect(() => resolveContainer('')).toThrow(/empty/);
  });

  it('throws on invalid target type', () => {
    expect(() =>
      resolveContainer(null as unknown as HTMLElement),
    ).toThrow(/selector string or an HTMLElement/);
  });
});

describe('mountStructure', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = buildFixture();
  });

  afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  });

  it('applies wrapper classes and marks container initialized', () => {
    mountStructure(container, makeOptions());
    expect(container.classList.contains(CLS.wrapper)).toBe(true);
    expect(container.classList.contains(CLS.initialized)).toBe(true);
    expect(container.classList.contains('user-class')).toBe(true);
    expect(container.getAttribute('data-user')).toBe('keep');
  });

  it('tags every section and every slide with the right class', () => {
    const mounted = mountStructure(container, makeOptions());
    for (const section of mounted.sections) {
      expect(section.element.classList.contains(CLS.section)).toBe(true);
    }
    for (const slide of mounted.slides) {
      expect(slide.element.classList.contains(CLS.slide)).toBe(true);
    }
  });

  it('parses sections with correct index and anchor', () => {
    const mounted = mountStructure(container, makeOptions());
    expect(mounted.sections).toHaveLength(3);
    expect(mounted.sections[0]?.index).toBe(0);
    expect(mounted.sections[0]?.anchor).toBe('home');
    expect(mounted.sections[1]?.anchor).toBe('gallery');
    expect(mounted.sections[2]?.anchor).toBe(null);
  });

  it('parses slides with correct parentSectionIndex and anchors', () => {
    const mounted = mountStructure(container, makeOptions());
    expect(mounted.slides).toHaveLength(3);
    expect(mounted.slides.map((s) => s.parentSectionIndex)).toEqual([1, 1, 1]);
    expect(mounted.slides.map((s) => s.anchor)).toEqual(['a', 'b', null]);
    expect(mounted.slides.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('wraps slides under a generated track, preserving DOM order', () => {
    const mounted = mountStructure(container, makeOptions());
    const gallery = mounted.sections[1]!.element;
    const tracks = gallery.querySelectorAll(`.${CLS.slidesTrack}`);
    expect(tracks).toHaveLength(1);
    const track = tracks[0]!;
    const slideEls = Array.from(track.children);
    expect(slideEls.map((e) => e.textContent?.trim())).toEqual(['A', 'B', 'C']);
  });

  it('does not create a track when a section has no slides', () => {
    const mounted = mountStructure(container, makeOptions());
    const empty = mounted.sections[2]!.element;
    expect(empty.querySelectorAll(`.${CLS.slidesTrack}`)).toHaveLength(0);
  });

  it('marks the first section active by default', () => {
    const mounted = mountStructure(container, makeOptions());
    expect(mounted.sections[0]?.isActive).toBe(true);
    expect(mounted.sections[1]?.isActive).toBe(false);
    expect(mounted.sections[2]?.isActive).toBe(false);
  });

  it('throws when no sections match the selector', () => {
    const empty = document.createElement('div');
    document.body.appendChild(empty);
    expect(() => mountStructure(empty, makeOptions())).toThrow(
      /no sections matched/,
    );
  });

  it('preserves non-snapdeck classes on user elements', () => {
    const mounted = mountStructure(container, makeOptions());
    expect(mounted.sections[0]?.element.classList.contains('hero')).toBe(true);
    expect(mounted.slides[0]?.element.classList.contains('slide-a')).toBe(true);
  });

  it('wraps slides even when they are nested inside wrapper elements', () => {
    // Real-world markup often wraps slides in layout containers; the track
    // must insert at the slides' actual parent, not always the section.
    const nestedRoot = document.createElement('div');
    nestedRoot.id = 'nested';
    const sec = document.createElement('section');
    sec.setAttribute('data-snapdeck-section', '');
    const outer = document.createElement('div');
    outer.classList.add('outer');
    const inner = document.createElement('div');
    inner.classList.add('inner');
    const a = makeSlide('A', 'a');
    const b = makeSlide('B', 'b');
    inner.appendChild(a);
    inner.appendChild(b);
    outer.appendChild(inner);
    sec.appendChild(outer);
    nestedRoot.appendChild(sec);
    document.body.appendChild(nestedRoot);

    const mounted = mountStructure(nestedRoot, makeOptions());
    const track = inner.querySelector(`.${CLS.slidesTrack}`);
    expect(track).not.toBeNull();
    expect(Array.from(track!.children)).toEqual([a, b]);

    mounted.teardown();
    // slides are back as direct children of inner; no stale track anywhere
    expect(inner.querySelector(`.${CLS.slidesTrack}`)).toBeNull();
    expect(inner.children[0]).toBe(a);
    expect(inner.children[1]).toBe(b);
  });

  it('treats blank data-anchor as null', () => {
    const s = container.querySelectorAll('[data-snapdeck-section]')[0] as HTMLElement;
    s.setAttribute('data-anchor', '   ');
    const mounted = mountStructure(container, makeOptions());
    expect(mounted.sections[0]?.anchor).toBe(null);
  });
});

describe('mountStructure teardown', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = buildFixture();
  });

  afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  });

  it('removes all snapdeck classes added at mount time', () => {
    const mounted = mountStructure(container, makeOptions());
    mounted.teardown();

    expect(container.classList.contains(CLS.wrapper)).toBe(false);
    expect(container.classList.contains(CLS.initialized)).toBe(false);
    for (const section of mounted.sections) {
      expect(section.element.classList.contains(CLS.section)).toBe(false);
    }
    for (const slide of mounted.slides) {
      expect(slide.element.classList.contains(CLS.slide)).toBe(false);
    }
    expect(container.classList.contains('user-class')).toBe(true);
  });

  it('unwraps slide tracks, restoring original slide order as direct children', () => {
    const mounted = mountStructure(container, makeOptions());
    mounted.teardown();

    const gallery = mounted.sections[1]!.element;
    expect(gallery.querySelectorAll(`.${CLS.slidesTrack}`)).toHaveLength(0);

    const directChildren = Array.from(gallery.children).filter(
      (c) => c.hasAttribute('data-snapdeck-slide'),
    );
    expect(directChildren.map((e) => e.textContent?.trim())).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('is idempotent', () => {
    const mounted = mountStructure(container, makeOptions());
    mounted.teardown();
    expect(() => mounted.teardown()).not.toThrow();
    expect(container.classList.contains(CLS.wrapper)).toBe(false);
  });
});
