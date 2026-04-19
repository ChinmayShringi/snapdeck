import type {
  NavigationPayload,
  Plugin,
  Section,
  SnapdeckInstance,
  Unsubscribe,
} from '@snapdeck/core';

/**
 * Options for the lazy-media plugin.
 */
export interface LazyMediaOptions {
  /**
   * Attribute whose value is transferred to the element's native `src`
   * when the host section becomes eager. Default: `data-src`.
   */
  readonly attribute?: string;
  /**
   * How many sections to load at init regardless (starting from the active).
   * Default: 1 (just the active section).
   */
  readonly eagerSections?: number;
  /**
   * How many neighbors of the active section to pre-load on init and on
   * each `afterLoad`. Default: 1.
   */
  readonly eagerAdjacent?: number;
  /**
   * CSS selectors for media elements to scan within each section.
   * Default: ['img', 'video', 'iframe', 'source'].
   */
  readonly mediaSelectors?: ReadonlyArray<string>;
}

const DEFAULT_SELECTORS: ReadonlyArray<string> = ['img', 'video', 'iframe', 'source'];

interface ResolvedOptions {
  readonly attribute: string;
  readonly srcsetAttribute: string;
  readonly posterAttribute: string;
  readonly eagerSections: number;
  readonly eagerAdjacent: number;
  readonly mediaSelectors: ReadonlyArray<string>;
}

function resolveOptions(opts: LazyMediaOptions | undefined): ResolvedOptions {
  const attribute = opts?.attribute ?? 'data-src';
  return {
    attribute,
    // Derive sibling attribute names from the base so a custom attribute
    // like `data-lazy-src` yields `data-lazy-srcset` / `data-lazy-poster`.
    srcsetAttribute: deriveSibling(attribute, 'srcset'),
    posterAttribute: deriveSibling(attribute, 'poster'),
    eagerSections: Math.max(0, opts?.eagerSections ?? 1),
    eagerAdjacent: Math.max(0, opts?.eagerAdjacent ?? 1),
    mediaSelectors:
      opts?.mediaSelectors && opts.mediaSelectors.length > 0
        ? opts.mediaSelectors
        : DEFAULT_SELECTORS,
  };
}

function deriveSibling(base: string, suffix: string): string {
  // `data-src` -> `data-srcset`, `data-something-src` -> `data-something-srcset`
  if (base.endsWith('-src')) {
    return `${base.slice(0, -3)}${suffix}`;
  }
  if (base.endsWith('src')) {
    return `${base.slice(0, -3)}${suffix}`;
  }
  return `${base}-${suffix}`;
}

function transferAttribute(
  el: Element,
  fromAttr: string,
  toAttr: string,
): void {
  const value = el.getAttribute(fromAttr);
  if (value === null) return;
  el.setAttribute(toAttr, value);
  el.removeAttribute(fromAttr);
}

function loadMedia(section: Section, opts: ResolvedOptions): void {
  const root = section.element;
  if (!root) return;
  for (const selector of opts.mediaSelectors) {
    const nodes = root.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i];
      if (!el) continue;
      transferAttribute(el, opts.attribute, 'src');
      transferAttribute(el, opts.srcsetAttribute, 'srcset');
      transferAttribute(el, opts.posterAttribute, 'poster');
    }
  }
}

function collectTargets(
  sections: ReadonlyArray<Section>,
  activeIndex: number,
  eagerSections: number,
  eagerAdjacent: number,
): ReadonlyArray<Section> {
  if (sections.length === 0) return [];
  const picked = new Set<number>();
  // eagerSections consecutive sections starting at active.
  for (let i = 0; i < eagerSections; i += 1) {
    const idx = activeIndex + i;
    if (idx >= 0 && idx < sections.length) picked.add(idx);
  }
  // Adjacents around active.
  for (let n = 1; n <= eagerAdjacent; n += 1) {
    if (activeIndex - n >= 0) picked.add(activeIndex - n);
    if (activeIndex + n < sections.length) picked.add(activeIndex + n);
  }
  const out: Section[] = [];
  picked.forEach((idx) => {
    const s = sections[idx];
    if (s) out.push(s);
  });
  return out;
}

/**
 * Snapdeck plugin: lazy-load media via `data-src` (and siblings).
 *
 * At install time and on every `afterLoad`, scans the destination section
 * plus its `eagerAdjacent` neighbors and transfers `data-src` -> `src`,
 * `data-srcset` -> `srcset`, and (for `<video>`) `data-poster` -> `poster`.
 *
 * The data-attributes are consumed: once loaded, the node is never touched
 * again. `destroy()` unsubscribes future hydration but leaves the DOM alone.
 */
export function lazyMedia(options?: LazyMediaOptions): Plugin {
  const opts = resolveOptions(options);
  let unsubscribe: Unsubscribe | null = null;

  return {
    name: 'lazy-media',
    install(instance: SnapdeckInstance): void {
      const sections = instance.state.sections;
      const activeIndex = instance.state.activeSectionIndex;
      const initial = collectTargets(
        sections,
        activeIndex,
        opts.eagerSections,
        opts.eagerAdjacent,
      );
      for (const section of initial) {
        loadMedia(section, opts);
      }

      unsubscribe = instance.on('afterLoad', (payload: NavigationPayload) => {
        const current = instance.state.sections;
        const targets = collectTargets(
          current,
          payload.destination.index,
          opts.eagerSections,
          opts.eagerAdjacent,
        );
        for (const section of targets) {
          loadMedia(section, opts);
        }
      });
    },
    destroy(): void {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  };
}
