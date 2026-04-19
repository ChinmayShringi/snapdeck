/**
 * Size observation helpers.
 *
 * Audit notes (self):
 * - Read-only: callers receive width/height; we never touch style or classes.
 * - `createSizeObserver` debounces on the trailing edge so a burst of resize
 *   notifications collapses into a single callback. Default 120ms.
 * - Initial size is NOT emitted synchronously: use `measureOnce` for the
 *   first read. This avoids double-callbacks when consumers wire up both.
 * - Fallback: when `ResizeObserver` is unavailable (older environments), we
 *   subscribe to `window`'s `resize` event and measure `target` on each fire.
 *   The fallback keeps the same debounce semantics.
 * - `stop()` is idempotent and cancels any pending debounce timer.
 * - No globals: each call returns a self-contained handle.
 */

export interface SizeRect {
  readonly width: number;
  readonly height: number;
}

export interface SizeObserverHandle {
  stop(): void;
}

export interface SizeObserverOptions {
  readonly debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 120;

export function measureOnce(target: HTMLElement): SizeRect {
  const rect = target.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

export function createSizeObserver(
  target: HTMLElement,
  onChange: (rect: SizeRect) => void,
  opts: SizeObserverOptions = {},
): SizeObserverHandle {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRect: SizeRect = { width: 0, height: 0 };

  const flush = (): void => {
    timer = null;
    if (stopped) return;
    onChange(lastRect);
  };

  const schedule = (rect: SizeRect): void => {
    lastRect = rect;
    if (stopped) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  };

  const hasResizeObserver =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'function';

  if (hasResizeObserver) {
    const RO = (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver;
    const observer = new RO((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      const box = entry.contentRect;
      schedule({ width: box.width, height: box.height });
    });
    observer.observe(target);
    return {
      stop(): void {
        if (stopped) return;
        stopped = true;
        observer.disconnect();
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      },
    };
  }

  // Fallback: window resize listener + getBoundingClientRect on target.
  const onResize = (): void => {
    schedule(measureOnce(target));
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', onResize);
  }

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', onResize);
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
