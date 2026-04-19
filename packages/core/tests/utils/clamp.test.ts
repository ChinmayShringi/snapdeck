import { describe, expect, it } from 'vitest';
import { clamp } from '../../src/utils/clamp.js';

describe('clamp', () => {
  it('returns n when inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below min', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('clamps above max', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('handles min === max', () => {
    expect(clamp(99, 7, 7)).toBe(7);
    expect(clamp(-1, 7, 7)).toBe(7);
  });

  it('propagates NaN (documented behavior)', () => {
    expect(Number.isNaN(clamp(Number.NaN, 0, 10))).toBe(true);
  });

  it('returns min when min > max (defensive)', () => {
    expect(clamp(5, 10, 0)).toBe(10);
  });
});
