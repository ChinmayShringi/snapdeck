import { describe, expect, it } from 'vitest';
import {
  directionBetween,
  oppositeHorizontal,
  oppositeVertical,
} from '../../src/utils/direction.js';

describe('directionBetween', () => {
  it('returns down when to > from', () => {
    expect(directionBetween(0, 3)).toBe('down');
  });

  it('returns up when to < from', () => {
    expect(directionBetween(5, 2)).toBe('up');
  });

  it('returns none when equal', () => {
    expect(directionBetween(4, 4)).toBe('none');
  });

  it('handles negatives', () => {
    expect(directionBetween(-1, -3)).toBe('up');
    expect(directionBetween(-3, -1)).toBe('down');
    expect(directionBetween(-2, -2)).toBe('none');
  });
});

describe('oppositeVertical', () => {
  it('swaps up <-> down', () => {
    expect(oppositeVertical('up')).toBe('down');
    expect(oppositeVertical('down')).toBe('up');
  });

  it('passes non-vertical through', () => {
    expect(oppositeVertical('none')).toBe('none');
    expect(oppositeVertical('left')).toBe('left');
    expect(oppositeVertical('right')).toBe('right');
  });
});

describe('oppositeHorizontal', () => {
  it('swaps left <-> right', () => {
    expect(oppositeHorizontal('left')).toBe('right');
    expect(oppositeHorizontal('right')).toBe('left');
  });

  it('passes non-horizontal through', () => {
    expect(oppositeHorizontal('up')).toBe('up');
    expect(oppositeHorizontal('down')).toBe('down');
    expect(oppositeHorizontal('none')).toBe('none');
  });
});
