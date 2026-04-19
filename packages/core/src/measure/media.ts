/**
 * matchMedia watcher.
 *
 * Audit notes (self):
 * - Uses the modern `addEventListener('change', ...)` API; we do not fall back
 *   to the deprecated `addListener` because Snapdeck targets evergreen
 *   browsers (and happy-dom in tests).
 * - `stop()` is idempotent: calling it twice is safe.
 * - When `window.matchMedia` is unavailable (SSR/non-browser), returns a
 *   no-op handle whose `matches()` reports `false`.
 */

export interface MediaWatcher {
  stop(): void;
  matches(): boolean;
}

export function watchMedia(
  query: string,
  onChange: (matches: boolean) => void,
): MediaWatcher {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return {
      stop(): void {
        /* no-op */
      },
      matches(): boolean {
        return false;
      },
    };
  }

  const mql = window.matchMedia(query);
  let stopped = false;

  const listener = (event: MediaQueryListEvent): void => {
    if (stopped) return;
    onChange(event.matches);
  };

  mql.addEventListener('change', listener);

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      mql.removeEventListener('change', listener);
    },
    matches(): boolean {
      return mql.matches;
    },
  };
}
