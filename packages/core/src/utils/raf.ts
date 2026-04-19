/**
 * requestAnimationFrame helpers.
 *
 * Audit notes (self):
 * - Falls back to setTimeout(0) when rAF is unavailable (non-browser contexts).
 */

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(() => resolve(), 0);
    }
  });
}
