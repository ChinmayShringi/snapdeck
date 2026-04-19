/**
 * Validate SnapdeckOptions, throwing Error with a descriptive message on the
 * first invalid field.
 *
 * Audit notes:
 * - Validates numeric ranges per spec.
 * - Anchors: rejects duplicates, empty strings, and values containing '/' or '#'.
 * - Does NOT validate CSS selector syntax (caller responsibility: browser throws
 *   at query time). This keeps validation synchronous and JSDOM-agnostic.
 */
import type { SnapdeckOptions } from '../types.js';

export function validateOptions(opts: SnapdeckOptions): void {
  if (opts.scrollingSpeed < 0) {
    throw new Error(
      `Invalid option: scrollingSpeed must be >= 0 (got ${opts.scrollingSpeed}).`,
    );
  }
  if (opts.wheelDebounceMs < 0) {
    throw new Error(
      `Invalid option: wheelDebounceMs must be >= 0 (got ${opts.wheelDebounceMs}).`,
    );
  }
  if (opts.responsiveWidth < 0) {
    throw new Error(
      `Invalid option: responsiveWidth must be >= 0 (got ${opts.responsiveWidth}).`,
    );
  }
  if (opts.responsiveHeight < 0) {
    throw new Error(
      `Invalid option: responsiveHeight must be >= 0 (got ${opts.responsiveHeight}).`,
    );
  }
  if (opts.touchSensitivityPct < 0 || opts.touchSensitivityPct > 100) {
    throw new Error(
      `Invalid option: touchSensitivityPct must be between 0 and 100 (got ${opts.touchSensitivityPct}).`,
    );
  }
  if (opts.fitToSectionDelayMs < 0) {
    throw new Error(
      `Invalid option: fitToSectionDelayMs must be >= 0 (got ${opts.fitToSectionDelayMs}).`,
    );
  }

  const seen = new Set<string>();
  for (const anchor of opts.anchors) {
    if (anchor === '') {
      throw new Error('Invalid option: anchors must not contain empty strings.');
    }
    if (anchor.includes('/') || anchor.includes('#')) {
      throw new Error(
        `Invalid option: anchors must not contain '/' or '#' (got '${anchor}').`,
      );
    }
    if (seen.has(anchor)) {
      throw new Error(
        `Invalid option: anchors must not contain duplicates (duplicate '${anchor}').`,
      );
    }
    seen.add(anchor);
  }
}
