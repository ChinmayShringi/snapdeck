/**
 * @snapdeck/v4-compat
 *
 * Drop-in shim for users migrating from fullpage.js v4 to @snapdeck/core.
 *
 * This package is original code. It never imports fullpage.js source and
 * derives its surface only from the publicly-documented v4 API: option
 * names, callback signatures, the `new fullpage('#el', {...})` constructor
 * shape, and the `window.fullpage_api` handle.
 */

import snapdeck from '@snapdeck/core';

import { bridgeCallbacks } from './callback-bridge.js';
import { mapV4Options } from './option-map.js';
import { createV4Api, type V4Api } from './api-shim.js';

export type { V4Api } from './api-shim.js';

export interface V4Options {
  [key: string]: unknown;
}

function resolveTarget(target: string | HTMLElement): string | HTMLElement {
  if (typeof target !== 'string') return target;
  // Accept "#id", ".class", or a bare id string like "fullpage".
  if (target.startsWith('#') || target.startsWith('.')) return target;
  return `#${target}`;
}

/**
 * Factory matching the fullpage.js v4 constructor shape.
 *
 *   const fp = fullpage('#fullpage', { anchors: ['a', 'b'], afterLoad: fn });
 */
export default function fullpage(
  selectorOrElement: string | HTMLElement,
  options: V4Options = {},
): V4Api {
  const { snapOptions, callbacks } = mapV4Options(options);
  const target = resolveTarget(selectorOrElement);
  const instance = snapdeck(target, snapOptions);
  const teardown = bridgeCallbacks(instance, callbacks);
  const api = createV4Api({ instance, teardown });

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)['fullpage_api'] = api;
  }

  return api;
}
