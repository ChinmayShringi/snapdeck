/**
 * Map fullpage.js v4 option keys to @snapdeck/core options.
 *
 * Behaviors are inferred from publicly-documented v4 option names only.
 * No GPL source inspection. Unknown keys trigger a console.warn and are
 * silently dropped.
 */

import type { SnapdeckOptions } from '@snapdeck/core';

/**
 * v4 callback names we forward to snapdeck events. Pulled out of the
 * options bag before the options are mapped to snapdeck options.
 */
export const V4_CALLBACK_KEYS = [
  'afterLoad',
  'onLeave',
  'beforeLeave',
  'afterRender',
  'afterResize',
  'afterResponsive',
  'afterSlideLoad',
  'onSlideLeave',
] as const;

export type V4CallbackKey = (typeof V4_CALLBACK_KEYS)[number];

export type V4CallbackBag = Partial<Record<V4CallbackKey, Function>>;

/**
 * Option keys we forward 1:1 to snapdeck. Snapdeck intentionally kept
 * the v4 names for options that carried over, so most of this table is
 * identity mapping. New renames get added here.
 */
const PASSTHROUGH_KEYS = new Set<keyof SnapdeckOptions>([
  'anchors',
  'scrollingSpeed',
  'easing',
  'loopTop',
  'loopBottom',
  'keyboardScrolling',
  'fitToSection',
  'lazyLoading',
  'recordHistory',
  'lockAnchors',
  'css3',
]);

/**
 * v4 options that we explicitly recognize but do not yet fully support.
 * We accept them without warning (to keep migration quiet) but do not
 * forward them. Document known limitations in the README.
 */
const KNOWN_NOOP_KEYS = new Set<string>([
  'licenseKey', // v4 paid-license key, not applicable
  'autoScrolling', // use setAutoScrolling at runtime
  'scrollBar',
  'navigation',
  'navigationPosition',
  'navigationTooltips',
  'showActiveTooltip',
  'slidesNavigation',
  'slidesNavPosition',
  'controlArrows',
  'verticalCentered',
  'sectionsColor',
  'paddingTop',
  'paddingBottom',
  'menu',
  'continuousVertical',
  'continuousHorizontal',
  'scrollHorizontally',
  'scrollOverflow',
  'scrollOverflowReset',
  'touchSensitivity',
  'bigSectionsDestination',
  'normalScrollElements',
  'normalScrollElementTouchThreshold',
  'animateAnchor',
  'dragAndMove',
  'offsetSections',
  'resetSliders',
  'interlockedSlides',
  'responsive',
  'responsiveWidth',
  'responsiveHeight',
  'responsiveSlides',
  'parallax',
  'parallaxOptions',
  'cards',
  'cardsOptions',
  'credits',
]);

export interface MappedOptions {
  readonly snapOptions: Partial<SnapdeckOptions>;
  readonly callbacks: V4CallbackBag;
}

/**
 * Split a v4 options bag into (snapdeck options, v4 callbacks).
 * Logs a warning for unknown keys. Never mutates the input.
 */
export function mapV4Options(input: Record<string, unknown>): MappedOptions {
  const snapOptions: Partial<Record<keyof SnapdeckOptions, unknown>> = {};
  const callbacks: V4CallbackBag = {};

  for (const key of Object.keys(input)) {
    const value = input[key];

    if ((V4_CALLBACK_KEYS as readonly string[]).includes(key)) {
      if (typeof value === 'function') {
        callbacks[key as V4CallbackKey] = value as Function;
      }
      continue;
    }

    if (PASSTHROUGH_KEYS.has(key as keyof SnapdeckOptions)) {
      snapOptions[key as keyof SnapdeckOptions] = value;
      continue;
    }

    if (KNOWN_NOOP_KEYS.has(key)) {
      // Recognized but not implemented, keep quiet to reduce migration noise.
      continue;
    }

    // eslint-disable-next-line no-console
    console.warn(`[snapdeck/v4-compat] unsupported option "${key}"`);
  }

  return {
    snapOptions: snapOptions as Partial<SnapdeckOptions>,
    callbacks,
  };
}
