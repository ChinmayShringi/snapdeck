/**
 * Runtime-mutable option keys. Must stay in sync with `RuntimeOptionKey` in
 * ../types.ts.
 *
 * Audit notes:
 * - A compile-time check (satisfies ReadonlySet<RuntimeOptionKey>) and a
 *   `Record<RuntimeOptionKey, true>` exhaustiveness guard ensure the set and
 *   union never drift.
 */
import type { RuntimeOptionKey, SnapdeckOptions } from '../types.js';

// Exhaustiveness helper: if a key is added/removed from the RuntimeOptionKey
// union, this object literal forces a compile error.
const RUNTIME_KEY_MAP: Record<RuntimeOptionKey, true> = {
  scrollingSpeed: true,
  easing: true,
  loopTop: true,
  loopBottom: true,
  keyboardScrolling: true,
  wheelDebounceMs: true,
  touchSensitivityPct: true,
  fitToSection: true,
  fitToSectionDelayMs: true,
  lazyLoading: true,
  recordHistory: true,
  lockAnchors: true,
};

export const RUNTIME_OPTION_KEYS: ReadonlySet<RuntimeOptionKey> = new Set(
  Object.keys(RUNTIME_KEY_MAP) as RuntimeOptionKey[],
);

export function isRuntimeKey(key: keyof SnapdeckOptions): key is RuntimeOptionKey {
  return RUNTIME_OPTION_KEYS.has(key as RuntimeOptionKey);
}
