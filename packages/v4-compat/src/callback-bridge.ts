/**
 * Translate v4 positional-argument callbacks into snapdeck payload-object
 * event handlers, then wire each one to the snapdeck instance via on().
 *
 * v4 signatures (from public docs):
 *   afterLoad(origin, destination, direction)
 *   onLeave(origin, destination, direction)  — return false to cancel
 *   beforeLeave(origin, destination, direction)
 *   afterRender()                             — no args
 *   afterResize(width, height)
 *   afterResponsive(isResponsive)
 *   afterSlideLoad(section, origin, destination, direction)
 *   onSlideLeave(section, origin, destination, direction)
 */

import type {
  NavigationPayload,
  OverflowPayload,
  ResizePayload,
  Section,
  SlideNavigationPayload,
  SnapdeckInstance,
  Unsubscribe,
} from '@snapdeck/core';

import type { V4CallbackBag } from './option-map.js';

type AnyFn = (...args: unknown[]) => unknown;

function invoke(fn: Function, args: unknown[]): unknown {
  return (fn as AnyFn)(...args);
}

export function bridgeCallbacks(
  instance: SnapdeckInstance,
  callbacks: V4CallbackBag,
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  if (callbacks.afterLoad) {
    const cb = callbacks.afterLoad;
    unsubs.push(
      instance.on('afterLoad', (p: NavigationPayload) => {
        invoke(cb, [p.origin, p.destination, p.direction]);
      }),
    );
  }

  if (callbacks.onLeave) {
    const cb = callbacks.onLeave;
    unsubs.push(
      instance.on('onLeave', (p: NavigationPayload) => {
        const result = invoke(cb, [p.origin, p.destination, p.direction]);
        // v4 returning false cancels navigation; snapdeck uses the same convention.
        return result as boolean | void;
      }),
    );
  }

  if (callbacks.beforeLeave) {
    const cb = callbacks.beforeLeave;
    unsubs.push(
      instance.on('beforeLeave', (p: NavigationPayload) => {
        const result = invoke(cb, [p.origin, p.destination, p.direction]);
        return result as boolean | void;
      }),
    );
  }

  if (callbacks.afterRender) {
    const cb = callbacks.afterRender;
    unsubs.push(
      instance.on('afterRender', () => {
        invoke(cb, []);
      }),
    );
  }

  if (callbacks.afterResize) {
    const cb = callbacks.afterResize;
    unsubs.push(
      instance.on('afterResize', (p: ResizePayload) => {
        invoke(cb, [p.width, p.height]);
      }),
    );
  }

  if (callbacks.afterResponsive) {
    const cb = callbacks.afterResponsive;
    unsubs.push(
      instance.on('afterResponsive', (isResponsive: boolean) => {
        invoke(cb, [isResponsive]);
      }),
    );
  }

  if (callbacks.afterSlideLoad) {
    const cb = callbacks.afterSlideLoad;
    unsubs.push(
      instance.on('afterSlideLoad', (p: SlideNavigationPayload) => {
        invoke(cb, [p.section, p.origin, p.destination, p.direction]);
      }),
    );
  }

  if (callbacks.onSlideLeave) {
    const cb = callbacks.onSlideLeave;
    unsubs.push(
      instance.on('onSlideLeave', (p: SlideNavigationPayload) => {
        const result = invoke(cb, [p.section, p.origin, p.destination, p.direction]);
        return result as boolean | void;
      }),
    );
  }

  // silence unused-import warnings in strict mode by tagging the payload types
  type _Unused = OverflowPayload | Section;
  void (0 as unknown as _Unused);

  return () => {
    for (const u of unsubs) u();
  };
}
