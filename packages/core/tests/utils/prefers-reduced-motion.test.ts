import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from '../../src/utils/prefers-reduced-motion.js';

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a boolean in happy-dom', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });

  it('returns true when matchMedia reports the preference', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia is missing', () => {
    const original = window.matchMedia;
    // @ts-expect-error intentionally clearing to simulate legacy env
    window.matchMedia = undefined;
    try {
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
