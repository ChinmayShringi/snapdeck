/**
 * Centralised CSS class names used by the Snapdeck DOM layer.
 *
 * The stylesheet lives elsewhere; this module only exports the names so that
 * every module adds/removes the same strings.
 */
export const CLS = {
  wrapper: 'snapdeck',
  sectionsTrack: 'snapdeck-sections',
  section: 'snapdeck-section',
  slidesTrack: 'snapdeck-slides',
  slide: 'snapdeck-slide',
  active: 'is-active',
  visible: 'is-visible',
  completely: 'is-completely',
  initialized: 'is-initialized',
} as const;

export type ClassName = (typeof CLS)[keyof typeof CLS];
