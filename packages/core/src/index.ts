/**
 * @snapdeck/core
 *
 * Public entry point. The implementation is assembled from modules in:
 *   - core/     store, events, options
 *   - dom/      mount, measure, styles
 *   - scroll/   engine, navigate, queue
 *   - input/    wheel, touch, keyboard, anchors
 *   - plugins/  pluggable extensions
 */

export type {
  AnchorOrIndex,
  Direction,
  NavigationPayload,
  OverflowPayload,
  Plugin,
  ResizePayload,
  RuntimeOptionKey,
  Section,
  Slide,
  SlideNavigationPayload,
  SnapdeckEventName,
  SnapdeckEvents,
  SnapdeckInstance,
  SnapdeckOptions,
  SnapdeckState,
  Trigger,
  Unsubscribe,
} from './types.js';

/**
 * Placeholder factory. Replaced in Wave 5 when the integrator wires modules together.
 */
export default function snapdeck(
  _container: string | HTMLElement,
  _options?: Partial<import('./types.js').SnapdeckOptions>,
): import('./types.js').SnapdeckInstance {
  throw new Error('snapdeck: not yet implemented (scaffold only)');
}
