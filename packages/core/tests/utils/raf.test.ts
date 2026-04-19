import { describe, expect, it } from 'vitest';
import { nextFrame } from '../../src/utils/raf.js';

describe('nextFrame', () => {
  it('resolves on the next animation frame', async () => {
    await expect(nextFrame()).resolves.toBeUndefined();
  });

  it('falls back to setTimeout when rAF is missing', async () => {
    const original = globalThis.requestAnimationFrame;
    // @ts-expect-error intentionally clearing to exercise fallback path
    globalThis.requestAnimationFrame = undefined;
    try {
      await expect(nextFrame()).resolves.toBeUndefined();
    } finally {
      globalThis.requestAnimationFrame = original;
    }
  });
});
