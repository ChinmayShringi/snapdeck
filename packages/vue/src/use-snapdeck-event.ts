/**
 * useSnapdeckEvent composable.
 *
 * Subscribes to a Snapdeck event for the active instance. Resolves the
 * instance via (in order):
 *   1. An explicit `apiRef` passed as the third argument.
 *   2. The ref injected under SNAPDECK_KEY by a parent useSnapdeck call.
 *
 * Watches the ref: when the instance becomes available the handler is
 * wired via `.on()` and the unsubscribe is remembered. When the ref
 * flips back to null, or the scope disposes, we unsubscribe cleanly.
 */

import { inject, onScopeDispose, watch, type Ref } from 'vue';
import type {
  SnapdeckEventName,
  SnapdeckEvents,
  SnapdeckInstance,
  Unsubscribe,
} from '@snapdeck/core';
import { SNAPDECK_KEY } from './use-snapdeck.js';

export function useSnapdeckEvent<K extends SnapdeckEventName>(
  event: K,
  handler: SnapdeckEvents[K],
  apiRef?: Ref<SnapdeckInstance | null>,
): void {
  const resolvedRef = apiRef ?? inject(SNAPDECK_KEY, null);
  if (!resolvedRef) {
    // No instance available (likely SSR or used outside a provider).
    return;
  }

  let unsubscribe: Unsubscribe | null = null;

  const stopWatch = watch(
    resolvedRef,
    (instance) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (instance) {
        unsubscribe = instance.on(event, handler);
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    stopWatch();
  });
}
