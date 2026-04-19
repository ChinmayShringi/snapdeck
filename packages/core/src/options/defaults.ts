/**
 * Default options for a Snapdeck instance.
 *
 * The object is deeply frozen (top-level is frozen; `anchors` and `plugins`
 * arrays are empty and also frozen) so consumers cannot accidentally mutate
 * shared defaults.
 */
import type { SnapdeckOptions } from '../types.js';

export const DEFAULT_OPTIONS: SnapdeckOptions = Object.freeze({
  sectionSelector: '[data-snapdeck-section]',
  slideSelector: '[data-snapdeck-slide]',
  anchors: Object.freeze([]) as ReadonlyArray<string>,
  scrollingSpeed: 700,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  loopTop: false,
  loopBottom: false,
  responsiveWidth: 0,
  responsiveHeight: 0,
  keyboardScrolling: true,
  wheelDebounceMs: 200,
  touchSensitivityPct: 5,
  fitToSection: true,
  fitToSectionDelayMs: 1000,
  lazyLoading: true,
  recordHistory: true,
  lockAnchors: false,
  css3: true,
  plugins: Object.freeze([]) as SnapdeckOptions['plugins'],
}) as SnapdeckOptions;
