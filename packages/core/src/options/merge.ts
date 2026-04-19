/**
 * Shallow merge of SnapdeckOptions.
 *
 * Audit notes:
 * - Arrays are REPLACED, never concatenated (required by spec).
 * - `undefined` values in the partial do NOT override defaults.
 * - Returns a new frozen object; defaults are never mutated.
 * - `null` is treated as an explicit value and WILL override (callers should
 *   not pass null for non-nullable option keys; type system prevents this).
 */
import type { SnapdeckOptions } from '../types.js';

export function mergeOptions(
  defaults: SnapdeckOptions,
  partial: Partial<SnapdeckOptions> | undefined,
): SnapdeckOptions {
  const merged: Record<string, unknown> = { ...defaults };

  if (partial) {
    for (const key of Object.keys(partial) as Array<keyof SnapdeckOptions>) {
      const value = partial[key];
      if (value !== undefined) {
        merged[key as string] = value;
      }
    }
  }

  return Object.freeze(merged) as unknown as SnapdeckOptions;
}
