/**
 * Browser environment detection.
 *
 * Audit notes (self):
 * - Checks both window and document to avoid false positives in SSR shims that
 *   define only one of them.
 */

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
