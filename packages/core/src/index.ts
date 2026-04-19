/**
 * @snapdeck/core
 *
 * Public entry point. Wires together the modules in:
 *   - core/     store, events, options
 *   - dom/      mount, measure, styles
 *   - scroll/   engine
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

import type { SnapdeckInstance, SnapdeckOptions } from './types.js';
import { Snapdeck } from './snapdeck.js';

export { Snapdeck } from './snapdeck.js';

/**
 * Factory: create a Snapdeck instance bound to the given container.
 */
export default function snapdeck(
  container: string | HTMLElement,
  options?: Partial<SnapdeckOptions>,
): SnapdeckInstance {
  return new Snapdeck(container, options);
}
