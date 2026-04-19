/**
 * Measurement module barrel.
 *
 * Exposes read-only helpers for viewport size, container size observation,
 * and matchMedia watching. No layout writes occur in this module.
 */

export { getViewportSize, matchResponsive } from './viewport.js';
export type { ViewportSize, ResponsiveThresholds } from './viewport.js';

export { createSizeObserver, measureOnce } from './observer.js';
export type { SizeRect, SizeObserverHandle, SizeObserverOptions } from './observer.js';

export { watchMedia } from './media.js';
export type { MediaWatcher } from './media.js';
