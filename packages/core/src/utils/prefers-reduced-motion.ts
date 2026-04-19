/**
 * Detect user's prefers-reduced-motion preference.
 *
 * Audit notes (self):
 * - Guards with isBrowser(): safe in SSR (returns false).
 * - Also guards typeof window.matchMedia so older browsers / test shims don't throw.
 */

import { isBrowser } from './is-browser.js';

export function prefersReducedMotion(): boolean {
  if (!isBrowser()) return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
