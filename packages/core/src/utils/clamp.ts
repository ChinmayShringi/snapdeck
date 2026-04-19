/**
 * Clamp a number to the inclusive [min, max] range.
 *
 * Audit notes (self):
 * - NaN behavior: if `n` is NaN, Math.max/Math.min propagate NaN; documented in tests.
 * - Assumes min <= max (caller responsibility). When min > max, returns min.
 */

export function clamp(n: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(n, min), max);
}
