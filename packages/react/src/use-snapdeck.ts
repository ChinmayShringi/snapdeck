import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import type { RefCallback } from 'react';
import snapdeck from '@snapdeck/core';
import type { SnapdeckInstance, SnapdeckOptions } from '@snapdeck/core';

export interface UseSnapdeckResult {
  /**
   * Ref callback to attach to the container element.
   * Using a callback ref (rather than an object ref) makes the hook
   * resilient to late-mounted containers.
   */
  readonly ref: RefCallback<HTMLElement>;
  /** The live Snapdeck instance, or `null` until the container has mounted. */
  readonly api: SnapdeckInstance | null;
}

/**
 * Create and manage a Snapdeck instance tied to the component lifecycle.
 *
 * The instance is created exactly once per mount. To change options at
 * runtime, call `api.setOption(...)` directly. This hook intentionally does
 * NOT re-create the instance when `options` change.
 */
export function useSnapdeck(options?: Partial<SnapdeckOptions>): UseSnapdeckResult {
  const [api, setApi] = useState<SnapdeckInstance | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const instanceRef = useRef<SnapdeckInstance | null>(null);
  // Freeze the options reference to the first-seen value; subsequent option
  // changes must flow through api.setOption (documented behavior).
  const optionsRef = useRef<Partial<SnapdeckOptions> | undefined>(options);

  const ref = useCallback<RefCallback<HTMLElement>>((node) => {
    elementRef.current = node;
  }, []);

  useLayoutEffect(() => {
    const node = elementRef.current;
    if (!node) {
      return;
    }
    // StrictMode double-invocation guard: if we already have an instance
    // attached to the same node, do not create another one.
    if (instanceRef.current) {
      return;
    }
    const instance = snapdeck(node, optionsRef.current);
    instanceRef.current = instance;
    setApi(instance);

    return () => {
      try {
        instance.destroy();
      } finally {
        instanceRef.current = null;
        setApi(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, api };
}
