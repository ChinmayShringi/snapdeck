/**
 * Two-way sync between URL hash and active section anchor.
 *
 * - Listens for `hashchange` events; when the hash matches a section anchor,
 *   calls onNavigate(index).
 * - Engine pushes the active section back in via onSectionChanged(); we write
 *   the hash via history.pushState / history.replaceState.
 * - A feedback guard (lastWrittenAnchor) prevents our own writes from
 *   re-triggering onNavigate.
 *
 * SSR-safe: if `window` is undefined we degrade to no-ops.
 */

import type { Section } from '../types.js';

export interface AnchorsInputOptions {
  /** Reads current sections list (fresh on each lookup). */
  readonly getSections: () => ReadonlyArray<Section>;
  /** Called when the user navigates by hash change. */
  readonly onNavigate: (sectionIndex: number) => void;
  /** When true, do not push hash history entries (silentMoveTo). */
  readonly lockAnchors?: () => boolean;
  /** Whether to use history.pushState (true) or replaceState (false). Default: true. */
  readonly recordHistory?: boolean;
}

export interface AnchorsInputHandle {
  /** Called by engine after navigation completes to sync URL. */
  onSectionChanged(section: Section): void;
  /** Reads the initial hash; returns the matching section index, or -1. */
  resolveInitial(): number;
  stop(): void;
}

function readHash(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
}

function findIndexByAnchor(
  sections: ReadonlyArray<Section>,
  anchor: string,
): number {
  if (anchor === '') {
    return -1;
  }
  for (const section of sections) {
    if (section.anchor === anchor) {
      return section.index;
    }
  }
  return -1;
}

export function attachAnchorsInput(
  options: AnchorsInputOptions,
): AnchorsInputHandle {
  const { getSections, onNavigate, lockAnchors, recordHistory = true } = options;

  const hasWindow = typeof window !== 'undefined';
  let lastWrittenAnchor: string | null = null;
  let stopped = false;

  const handler = (): void => {
    if (stopped) {
      return;
    }
    const anchor = readHash();
    // Our own write; ignore to avoid feedback loop.
    if (anchor !== '' && anchor === lastWrittenAnchor) {
      return;
    }
    const index = findIndexByAnchor(getSections(), anchor);
    if (index === -1) {
      return;
    }
    onNavigate(index);
  };

  if (hasWindow) {
    window.addEventListener('hashchange', handler);
  }

  function writeHash(anchor: string): void {
    if (!hasWindow) {
      return;
    }
    lastWrittenAnchor = anchor;
    const url = `#${anchor}`;
    const history = window.history;
    if (history && typeof history.pushState === 'function' && typeof history.replaceState === 'function') {
      if (recordHistory) {
        history.pushState(null, '', url);
      } else {
        history.replaceState(null, '', url);
      }
      return;
    }
    // Fallback: direct hash mutation. The resulting hashchange will be
    // suppressed by the lastWrittenAnchor guard.
    window.location.hash = anchor;
  }

  return {
    onSectionChanged(section: Section): void {
      if (stopped || !hasWindow) {
        return;
      }
      if (section.anchor === null) {
        return;
      }
      if (lockAnchors?.() === true) {
        return;
      }
      if (section.anchor === readHash()) {
        // Already in sync; still record it so any pending event is suppressed.
        lastWrittenAnchor = section.anchor;
        return;
      }
      writeHash(section.anchor);
    },
    resolveInitial(): number {
      if (!hasWindow) {
        return -1;
      }
      const anchor = readHash();
      return findIndexByAnchor(getSections(), anchor);
    },
    stop(): void {
      if (stopped) {
        return;
      }
      stopped = true;
      if (hasWindow) {
        window.removeEventListener('hashchange', handler);
      }
    },
  };
}
