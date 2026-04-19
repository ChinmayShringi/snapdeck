/**
 * Viewport size + responsive threshold helpers.
 *
 * Audit notes (self):
 * - Read-only: never writes to the DOM or mutates caller inputs.
 * - Safe in SSR / non-browser environments: returns a zeroed size and treats
 *   matchResponsive as false when `window` is not defined.
 * - `matchResponsive` prefers `matchMedia` so browsers naturally keep
 *   consumers in sync with their own breakpoint logic; we fall back to a
 *   direct `innerWidth`/`innerHeight` comparison when matchMedia is missing.
 */

import { isBrowser } from '../utils/is-browser.js';

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface ResponsiveThresholds {
  readonly responsiveWidth: number;
  readonly responsiveHeight: number;
}

export function getViewportSize(): ViewportSize {
  if (!isBrowser()) {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function matchesQuery(query: string): boolean {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function matchResponsive(options: ResponsiveThresholds): boolean {
  const { responsiveWidth, responsiveHeight } = options;
  if (!isBrowser()) {
    return false;
  }
  const widthActive = responsiveWidth > 0;
  const heightActive = responsiveHeight > 0;
  if (!widthActive && !heightActive) {
    return false;
  }
  const size = getViewportSize();
  const widthHit = widthActive
    ? matchesQuery(`(max-width: ${responsiveWidth - 1}px)`) || size.width < responsiveWidth
    : false;
  const heightHit = heightActive
    ? matchesQuery(`(max-height: ${responsiveHeight - 1}px)`) || size.height < responsiveHeight
    : false;
  return widthHit || heightHit;
}
