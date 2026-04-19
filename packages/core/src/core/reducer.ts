import type { SnapdeckState } from '../types.js';
import type { Action } from './actions.js';

/**
 * Pure reducer for Snapdeck state.
 *
 * Contract:
 * - Always returns the SAME reference when the action is a no-op
 *   (e.g. resizing to the current width/height, dispatching the same
 *   structure twice). Store.dispatch relies on reference equality to
 *   decide whether to notify subscribers.
 * - Never mutates the input state; spreads produce new objects.
 */
export function reduce(state: SnapdeckState, action: Action): SnapdeckState {
  switch (action.type) {
    case 'structure/set': {
      if (state.sections === action.sections && state.slides === action.slides) {
        return state;
      }
      return { ...state, sections: action.sections, slides: action.slides };
    }

    case 'navigate/start': {
      if (state.isAnimating && state.activeSectionIndex === action.destination) {
        return state;
      }
      return {
        ...state,
        isAnimating: true,
        activeSectionIndex: action.destination,
      };
    }

    case 'navigate/end': {
      if (!state.isAnimating && state.activeSectionIndex === action.destination) {
        return state;
      }
      return {
        ...state,
        isAnimating: false,
        activeSectionIndex: action.destination,
      };
    }

    case 'navigate/cancel': {
      if (!state.isAnimating) return state;
      return { ...state, isAnimating: false };
    }

    case 'resize': {
      if (state.width === action.width && state.height === action.height) {
        return state;
      }
      return { ...state, width: action.width, height: action.height };
    }

    case 'responsive/set': {
      if (state.isResponsive === action.isResponsive) return state;
      return { ...state, isResponsive: action.isResponsive };
    }

    case 'scroll/set': {
      if (state.scrollX === action.scrollX && state.scrollY === action.scrollY) {
        return state;
      }
      return { ...state, scrollX: action.scrollX, scrollY: action.scrollY };
    }

    case 'canScroll/set': {
      if (state.canScroll === action.canScroll) return state;
      return { ...state, canScroll: action.canScroll };
    }
  }
}
