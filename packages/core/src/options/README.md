# @snapdeck/core — options

Shallow-merged, validated, immutable configuration for a Snapdeck instance.

## Files

- `defaults.ts` — `DEFAULT_OPTIONS`: frozen baseline config.
- `merge.ts` — `mergeOptions(defaults, partial)`: shallow merge, returns frozen copy.
- `validate.ts` — `validateOptions(opts)`: throws on invalid values.
- `runtime-keys.ts` — `RUNTIME_OPTION_KEYS`, `isRuntimeKey(k)`.

## Defaults

| Key | Default |
| --- | --- |
| sectionSelector | `'[data-snapdeck-section]'` |
| slideSelector | `'[data-snapdeck-slide]'` |
| anchors | `[]` |
| scrollingSpeed | `700` |
| easing | `'cubic-bezier(0.25, 0.1, 0.25, 1)'` |
| loopTop / loopBottom | `false` |
| responsiveWidth / responsiveHeight | `0` |
| keyboardScrolling | `true` |
| wheelDebounceMs | `200` |
| touchSensitivityPct | `5` |
| fitToSection | `true` |
| fitToSectionDelayMs | `1000` |
| lazyLoading | `true` |
| recordHistory | `true` |
| lockAnchors | `false` |
| css3 | `true` |
| plugins | `[]` |

## Merge semantics

- Shallow merge only. Arrays are REPLACED (never concatenated).
- `undefined` partial values are ignored (defaults win).
- Result is `Object.freeze`d.

## Validation rules

- `scrollingSpeed`, `wheelDebounceMs`, `fitToSectionDelayMs`, `responsiveWidth`, `responsiveHeight` must be `>= 0`.
- `touchSensitivityPct` must be in `[0, 100]`.
- `anchors` must not contain duplicates, empty strings, or values with `/` or `#`.

Violations throw `Error` with a descriptive message naming the offending key.

## Runtime keys

`RUNTIME_OPTION_KEYS` lists the subset of options safely mutable after init via
`instance.setOption(key, value)`. Kept in lock-step with the `RuntimeOptionKey`
union in `../types.ts` via an exhaustive record guard.
