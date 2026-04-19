/**
 * Direction helpers.
 *
 * Audit notes (self):
 * - directionBetween only returns 'up' | 'down' | 'none'. Horizontal directions come from
 *   slide helpers that produce 'left' | 'right' directly; we provide oppositeHorizontal for them.
 * - oppositeVertical maps 'up' <-> 'down'; 'none' stays 'none'; horizontals map to themselves.
 * - oppositeHorizontal mirrors the same contract for 'left' | 'right'.
 */

import type { Direction } from '../types.js';

export function directionBetween(from: number, to: number): Direction {
  if (to < from) return 'up';
  if (to > from) return 'down';
  return 'none';
}

export function oppositeVertical(d: Direction): Direction {
  if (d === 'up') return 'down';
  if (d === 'down') return 'up';
  return d;
}

export function oppositeHorizontal(d: Direction): Direction {
  if (d === 'left') return 'right';
  if (d === 'right') return 'left';
  return d;
}
