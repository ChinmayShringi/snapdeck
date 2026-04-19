import { useContext, useEffect, useRef } from 'react';
import type { DependencyList } from 'react';
import type { SnapdeckEventName, SnapdeckEvents } from '@snapdeck/core';
import { SnapdeckContext } from './context.js';

/**
 * Subscribe to a Snapdeck event from within a component wrapped by
 * {@link SnapdeckProvider}.
 *
 * The `handler` is stored in a ref, so the latest function body is always
 * invoked even when `deps` is `[]` (the default). Pass a dependency list only
 * if you want the subscription itself to be torn down and re-created.
 */
export function useSnapdeckEvent<K extends SnapdeckEventName>(
  event: K,
  handler: SnapdeckEvents[K],
  deps: DependencyList = [],
): void {
  const instance = useContext(SnapdeckContext);
  const handlerRef = useRef<SnapdeckEvents[K]>(handler);

  // Keep the ref up to date every render so the subscription can read the
  // latest closure without needing the caller to manage deps.
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!instance) {
      return;
    }
    const proxy = ((...args: unknown[]) => {
      const fn = handlerRef.current as unknown as (...a: unknown[]) => unknown;
      return fn(...args);
    }) as SnapdeckEvents[K];
    const unsubscribe = instance.on(event, proxy);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, event, ...deps]);
}
