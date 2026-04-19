/**
 * Recursive deep-freeze for plain objects and arrays.
 *
 * Audit notes (self):
 * - Skips functions, Dates, Maps, Sets and other non-plain instances (left as-is).
 * - Cycle-safe via WeakSet tracker.
 * - Idempotent: already-frozen objects short-circuit.
 * - Returns the same reference (cast to Readonly<T>); does not clone.
 */

function isFreezableContainer(value: unknown): value is Record<PropertyKey, unknown> | unknown[] {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function freezeRecursive(value: unknown, seen: WeakSet<object>): void {
  if (!isFreezableContainer(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  if (!Object.isFrozen(value)) {
    Object.freeze(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      freezeRecursive(item, seen);
    }
    return;
  }
  for (const key of Object.keys(value)) {
    freezeRecursive((value as Record<string, unknown>)[key], seen);
  }
}

export function deepFreeze<T>(obj: T): Readonly<T> {
  freezeRecursive(obj, new WeakSet<object>());
  return obj as Readonly<T>;
}
