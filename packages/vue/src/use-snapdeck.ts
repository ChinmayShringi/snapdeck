/**
 * useSnapdeck composable.
 *
 * Binds a template ref to a Snapdeck instance on mount and tears it down
 * automatically when the component's effect scope disposes.
 *
 * SSR safe: does nothing during SSR (no window, onMounted does not fire).
 */

import {
  onMounted,
  onScopeDispose,
  provide,
  ref,
  type InjectionKey,
  type Ref,
} from 'vue';
import snapdeck from '@snapdeck/core';
import type { SnapdeckInstance, SnapdeckOptions } from '@snapdeck/core';

export interface UseSnapdeckReturn {
  readonly containerRef: Ref<HTMLElement | null>;
  readonly api: Ref<SnapdeckInstance | null>;
}

/**
 * Injection key used to share the active Snapdeck instance ref with
 * descendant components (consumed by useSnapdeckEvent when no explicit
 * api is passed).
 */
export const SNAPDECK_KEY: InjectionKey<Ref<SnapdeckInstance | null>> =
  Symbol('snapdeck');

export function useSnapdeck(
  options?: Partial<SnapdeckOptions>,
): UseSnapdeckReturn {
  const containerRef: Ref<HTMLElement | null> = ref(null);
  const api: Ref<SnapdeckInstance | null> = ref(null);

  // Publish to descendants via provide/inject so useSnapdeckEvent can
  // resolve the instance without prop drilling.
  provide(SNAPDECK_KEY, api);

  onMounted(() => {
    if (typeof window === 'undefined') return;
    const el = containerRef.value;
    if (!el) return;
    api.value = snapdeck(el, options);
  });

  onScopeDispose(() => {
    const instance = api.value;
    if (instance) {
      instance.destroy();
    }
    api.value = null;
  });

  return { containerRef, api };
}
