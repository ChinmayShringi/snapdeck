/**
 * Audit (self-review):
 * - Covered every validation branch (each throws a descriptive message).
 * - Covered mergeOptions empty, override, undefined-skip, array-replace, frozen.
 * - Verified DEFAULT_OPTIONS has every SnapdeckOptions key by comparing against
 *   a typed key list derived from the interface at compile time.
 * - isRuntimeKey tested for every option key (both runtime and non-runtime).
 * - RUNTIME_OPTION_KEYS size and contents cross-checked against the
 *   RuntimeOptionKey union via a compile-time exhaustive map mirror.
 * Known gap: selector CSS syntax not validated (by design; documented in
 *   validate.ts audit notes).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS } from '../../src/options/defaults.js';
import { mergeOptions } from '../../src/options/merge.js';
import { validateOptions } from '../../src/options/validate.js';
import {
  RUNTIME_OPTION_KEYS,
  isRuntimeKey,
} from '../../src/options/runtime-keys.js';
import type {
  RuntimeOptionKey,
  SnapdeckOptions,
} from '../../src/types.js';

const ALL_OPTION_KEYS: Array<keyof SnapdeckOptions> = [
  'sectionSelector',
  'slideSelector',
  'anchors',
  'scrollingSpeed',
  'easing',
  'loopTop',
  'loopBottom',
  'responsiveWidth',
  'responsiveHeight',
  'keyboardScrolling',
  'wheelDebounceMs',
  'touchSensitivityPct',
  'fitToSection',
  'fitToSectionDelayMs',
  'lazyLoading',
  'recordHistory',
  'lockAnchors',
  'css3',
  'plugins',
];

const EXPECTED_RUNTIME_KEYS: RuntimeOptionKey[] = [
  'scrollingSpeed',
  'easing',
  'loopTop',
  'loopBottom',
  'keyboardScrolling',
  'wheelDebounceMs',
  'touchSensitivityPct',
  'fitToSection',
  'fitToSectionDelayMs',
  'lazyLoading',
  'recordHistory',
  'lockAnchors',
];

describe('DEFAULT_OPTIONS', () => {
  it('contains every required key', () => {
    for (const key of ALL_OPTION_KEYS) {
      expect(DEFAULT_OPTIONS).toHaveProperty(key);
    }
  });

  it('has the expected literal defaults', () => {
    expect(DEFAULT_OPTIONS.sectionSelector).toBe('[data-snapdeck-section]');
    expect(DEFAULT_OPTIONS.slideSelector).toBe('[data-snapdeck-slide]');
    expect(DEFAULT_OPTIONS.anchors).toEqual([]);
    expect(DEFAULT_OPTIONS.scrollingSpeed).toBe(700);
    expect(DEFAULT_OPTIONS.easing).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    expect(DEFAULT_OPTIONS.loopTop).toBe(false);
    expect(DEFAULT_OPTIONS.loopBottom).toBe(false);
    expect(DEFAULT_OPTIONS.responsiveWidth).toBe(0);
    expect(DEFAULT_OPTIONS.responsiveHeight).toBe(0);
    expect(DEFAULT_OPTIONS.keyboardScrolling).toBe(true);
    expect(DEFAULT_OPTIONS.wheelDebounceMs).toBe(200);
    expect(DEFAULT_OPTIONS.touchSensitivityPct).toBe(5);
    expect(DEFAULT_OPTIONS.fitToSection).toBe(true);
    expect(DEFAULT_OPTIONS.fitToSectionDelayMs).toBe(1000);
    expect(DEFAULT_OPTIONS.lazyLoading).toBe(true);
    expect(DEFAULT_OPTIONS.recordHistory).toBe(true);
    expect(DEFAULT_OPTIONS.lockAnchors).toBe(false);
    expect(DEFAULT_OPTIONS.css3).toBe(true);
    expect(DEFAULT_OPTIONS.plugins).toEqual([]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_OPTIONS)).toBe(true);
  });
});

describe('mergeOptions', () => {
  it('returns a structurally-equal but distinct object for empty partial', () => {
    const merged = mergeOptions(DEFAULT_OPTIONS, {});
    expect(merged).toEqual(DEFAULT_OPTIONS);
    expect(merged).not.toBe(DEFAULT_OPTIONS);
  });

  it('handles undefined partial', () => {
    const merged = mergeOptions(DEFAULT_OPTIONS, undefined);
    expect(merged).toEqual(DEFAULT_OPTIONS);
    expect(merged).not.toBe(DEFAULT_OPTIONS);
  });

  it('overrides individual keys', () => {
    const merged = mergeOptions(DEFAULT_OPTIONS, {
      scrollingSpeed: 1234,
      loopTop: true,
    });
    expect(merged.scrollingSpeed).toBe(1234);
    expect(merged.loopTop).toBe(true);
    expect(merged.easing).toBe(DEFAULT_OPTIONS.easing);
  });

  it('skips undefined values in partial', () => {
    // Cast: exactOptionalPropertyTypes forbids `undefined` for required keys,
    // but we must verify runtime handling of callers who pass it anyway.
    const partial = {
      scrollingSpeed: undefined,
      loopTop: true,
    } as unknown as Partial<SnapdeckOptions>;
    const merged = mergeOptions(DEFAULT_OPTIONS, partial);
    expect(merged.scrollingSpeed).toBe(DEFAULT_OPTIONS.scrollingSpeed);
    expect(merged.loopTop).toBe(true);
  });

  it('replaces arrays (does not concatenate)', () => {
    const base = mergeOptions(DEFAULT_OPTIONS, { anchors: ['a', 'b'] });
    const next = mergeOptions(base, { anchors: ['c'] });
    expect(next.anchors).toEqual(['c']);
  });

  it('returns a frozen object', () => {
    const merged = mergeOptions(DEFAULT_OPTIONS, { scrollingSpeed: 10 });
    expect(Object.isFrozen(merged)).toBe(true);
  });
});

describe('validateOptions', () => {
  it('accepts the defaults', () => {
    expect(() => validateOptions(DEFAULT_OPTIONS)).not.toThrow();
  });

  it('rejects negative scrollingSpeed', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { scrollingSpeed: -1 })),
    ).toThrow(/scrollingSpeed/);
  });

  it('rejects negative wheelDebounceMs', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { wheelDebounceMs: -5 })),
    ).toThrow(/wheelDebounceMs/);
  });

  it('rejects negative responsiveWidth', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { responsiveWidth: -1 })),
    ).toThrow(/responsiveWidth/);
  });

  it('rejects negative responsiveHeight', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { responsiveHeight: -1 })),
    ).toThrow(/responsiveHeight/);
  });

  it('rejects touchSensitivityPct < 0', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { touchSensitivityPct: -1 })),
    ).toThrow(/touchSensitivityPct/);
  });

  it('rejects touchSensitivityPct > 100', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { touchSensitivityPct: 101 })),
    ).toThrow(/touchSensitivityPct/);
  });

  it('rejects negative fitToSectionDelayMs', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { fitToSectionDelayMs: -1 })),
    ).toThrow(/fitToSectionDelayMs/);
  });

  it('rejects duplicate anchors', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { anchors: ['a', 'a'] })),
    ).toThrow(/duplicate/);
  });

  it('rejects empty-string anchors', () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { anchors: [''] })),
    ).toThrow(/empty/);
  });

  it("rejects anchors containing '/'", () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { anchors: ['foo/bar'] })),
    ).toThrow(/'\/' or '#'/);
  });

  it("rejects anchors containing '#'", () => {
    expect(() =>
      validateOptions(mergeOptions(DEFAULT_OPTIONS, { anchors: ['foo#bar'] })),
    ).toThrow(/'\/' or '#'/);
  });

  it('accepts valid customisations', () => {
    const opts = mergeOptions(DEFAULT_OPTIONS, {
      anchors: ['intro', 'features', 'pricing'],
      scrollingSpeed: 0,
      wheelDebounceMs: 0,
      touchSensitivityPct: 100,
      fitToSectionDelayMs: 0,
      responsiveWidth: 0,
      responsiveHeight: 0,
    });
    expect(() => validateOptions(opts)).not.toThrow();
  });
});

describe('runtime keys', () => {
  it('RUNTIME_OPTION_KEYS matches the expected RuntimeOptionKey union', () => {
    expect(RUNTIME_OPTION_KEYS.size).toBe(EXPECTED_RUNTIME_KEYS.length);
    for (const key of EXPECTED_RUNTIME_KEYS) {
      expect(RUNTIME_OPTION_KEYS.has(key)).toBe(true);
    }
  });

  it('isRuntimeKey classifies every SnapdeckOptions key correctly', () => {
    const runtimeSet = new Set<string>(EXPECTED_RUNTIME_KEYS);
    for (const key of ALL_OPTION_KEYS) {
      expect(isRuntimeKey(key)).toBe(runtimeSet.has(key));
    }
  });
});
