import { describe, expect, it } from 'vitest';
import { resolveIndex } from '../../src/utils/resolve-index.js';

const items = [
  { anchor: 'home' },
  { anchor: null },
  { anchor: 'About' },
  { anchor: 'contact' },
];

describe('resolveIndex', () => {
  it('passes through a numeric target', () => {
    expect(resolveIndex(2, items)).toBe(2);
  });

  it('passes through numeric target even when out of range (caller validates)', () => {
    expect(resolveIndex(99, items)).toBe(99);
    expect(resolveIndex(-5, items)).toBe(-5);
  });

  it('finds a matching anchor by string', () => {
    expect(resolveIndex('home', items)).toBe(0);
    expect(resolveIndex('contact', items)).toBe(3);
  });

  it('returns -1 when string is not found', () => {
    expect(resolveIndex('missing', items)).toBe(-1);
  });

  it('is case sensitive', () => {
    expect(resolveIndex('about', items)).toBe(-1);
    expect(resolveIndex('About', items)).toBe(2);
  });

  it('returns -1 for empty list', () => {
    expect(resolveIndex('home', [])).toBe(-1);
  });

  it('skips null anchors', () => {
    expect(resolveIndex('', items)).toBe(-1);
  });
});
