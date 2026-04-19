import type { SnapdeckState } from '../types.js';

/**
 * Factory for a fresh, immutable initial state.
 * A function, not a constant, so each Snapdeck instance gets its own object.
 */
export function createInitialState(): SnapdeckState {
  return {
    sections: [],
    slides: [],
    activeSectionIndex: -1,
    isAnimating: false,
    canScroll: true,
    isResponsive: false,
    width: 0,
    height: 0,
    scrollY: 0,
    scrollX: 0,
  };
}
