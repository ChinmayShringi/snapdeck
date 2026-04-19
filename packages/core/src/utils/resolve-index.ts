/**
 * Resolve an AnchorOrIndex to a zero-based index.
 *
 * Audit notes (self):
 * - Number target: returned as-is (including negatives / out-of-range). Caller validates range.
 * - String target: exact case-sensitive anchor match. Returns -1 if not found or list empty.
 * - Items with null anchor never match (strict equality after null-guard).
 */

import type { AnchorOrIndex } from '../types.js';

export function resolveIndex(
  target: AnchorOrIndex,
  items: ReadonlyArray<{ anchor: string | null }>,
): number {
  if (typeof target === 'number') {
    return target;
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.anchor !== null && item.anchor === target) {
      return i;
    }
  }
  return -1;
}
