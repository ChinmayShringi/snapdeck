/**
 * Expose a fullpage.js v4-style API object around a SnapdeckInstance.
 *
 * v4 method names that we support fully:
 *   moveTo, moveSectionUp, moveSectionDown, moveSlideLeft, moveSlideRight,
 *   setKeyboardScrolling, getActiveSection, destroy, reBuild.
 *
 * Partial / warning-only:
 *   setAutoScrolling(false) — snapdeck has no runtime toggle; warns.
 *   setAllowScrolling       — snapdeck has no runtime toggle; warns.
 */

import type { AnchorOrIndex, SnapdeckInstance } from '@snapdeck/core';

export interface V4Api {
  moveTo(section: AnchorOrIndex, slide?: AnchorOrIndex): void;
  moveSectionUp(): void;
  moveSectionDown(): void;
  moveSlideLeft(): void;
  moveSlideRight(): void;
  setAutoScrolling(enabled: boolean): void;
  setAllowScrolling(enabled: boolean): void;
  setKeyboardScrolling(enabled: boolean): void;
  getActiveSection(): { index: number; anchor: string | null } | null;
  destroy(arg?: 'all'): void;
  reBuild(): void;
}

export interface CreateApiArgs {
  readonly instance: SnapdeckInstance;
  readonly teardown: () => void;
}

export function createV4Api(args: CreateApiArgs): V4Api {
  const { instance, teardown } = args;

  const api: V4Api = {
    moveTo(section, slide) {
      if (slide === undefined) {
        void instance.moveTo(section);
      } else {
        void instance.moveTo(section, slide);
      }
    },
    moveSectionUp() {
      void instance.moveUp();
    },
    moveSectionDown() {
      void instance.moveDown();
    },
    moveSlideLeft() {
      void instance.moveSlideLeft();
    },
    moveSlideRight() {
      void instance.moveSlideRight();
    },
    setAutoScrolling(enabled) {
      // Snapdeck's engine is always in snap mode; there is no runtime toggle
      // for standard page scrolling. Surface a warning so callers notice.
      // eslint-disable-next-line no-console
      console.warn(
        `[snapdeck/v4-compat] setAutoScrolling(${String(enabled)}) is not implemented; snapdeck is always in snap mode.`,
      );
    },
    setAllowScrolling(enabled) {
      // No direct runtime setter today; warn and no-op.
      // eslint-disable-next-line no-console
      console.warn(
        `[snapdeck/v4-compat] setAllowScrolling(${String(enabled)}) is not implemented; see README for workarounds.`,
      );
    },
    setKeyboardScrolling(enabled) {
      instance.setOption('keyboardScrolling', enabled);
    },
    getActiveSection() {
      const active = instance.activeSection;
      if (!active) return null;
      return { index: active.index, anchor: active.anchor };
    },
    destroy(arg) {
      teardown();
      instance.destroy();
      if (arg === 'all' && typeof window !== 'undefined') {
        try {
          delete (window as unknown as Record<string, unknown>)['fullpage_api'];
        } catch {
          (window as unknown as Record<string, unknown>)['fullpage_api'] = undefined;
        }
      }
    },
    reBuild() {
      instance.refresh();
    },
  };

  return api;
}
