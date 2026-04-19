/**
 * @snapdeck/plugin-progress-bar
 *
 * Renders a fixed top or bottom reading-progress bar whose fill width tracks
 * the active section index. The plugin writes only CSS custom properties;
 * actual dimensions and colors are controlled from the stylesheet so users
 * can fully re-theme the bar without touching JS.
 */

import type { Plugin, SnapdeckInstance, Unsubscribe } from '@snapdeck/core';

export interface ProgressBarOptions {
  readonly position?: 'top' | 'bottom';
  readonly thickness?: string;
  readonly color?: string;
  readonly className?: string;
  readonly showPerSection?: boolean;
}

const ROOT_CLASS = 'snapdeck-progress-bar';
const FILL_CLASS = 'snapdeck-progress-bar__fill';
const DEFAULT_THICKNESS = '3px';

/**
 * Create a progress-bar plugin instance. Each call returns a fresh plugin
 * object so it can be installed on independent Snapdeck instances.
 */
export function progressBar(options: ProgressBarOptions = {}): Plugin {
  const config = {
    position: options.position ?? 'top',
    thickness: options.thickness ?? DEFAULT_THICKNESS,
    color: options.color,
    className: options.className,
    showPerSection: options.showPerSection ?? false,
  } as const;

  // Per-install state. Captured via closure so destroy() can clean up.
  let root: HTMLDivElement | null = null;
  let fill: HTMLDivElement | null = null;
  let unsubs: ReadonlyArray<Unsubscribe> = [];
  let instanceRef: SnapdeckInstance | null = null;

  const totalSections = (): number => {
    if (!instanceRef) return 0;
    return instanceRef.state.sections.length;
  };

  const updateFill = (): void => {
    if (!root || !instanceRef) return;
    const total = totalSections();
    if (total <= 0) {
      root.style.setProperty('--snapdeck-progress-value', '0');
      return;
    }
    const idx = instanceRef.state.activeSectionIndex;
    // Progress is 1-based: being on section 0 of N shows 1/N complete.
    const safeIdx = idx < 0 ? 0 : idx;
    const value = (safeIdx + 1) / total;
    // Clamp defensively to [0, 1] without mutating inputs.
    const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
    root.style.setProperty('--snapdeck-progress-value', String(clamped));
  };

  return {
    name: 'progress-bar',

    install(instance: SnapdeckInstance): void {
      instanceRef = instance;

      const el = document.createElement('div');
      el.className = ROOT_CLASS;
      if (config.className) {
        el.className = `${ROOT_CLASS} ${config.className}`;
      }
      el.setAttribute('data-position', config.position);
      if (config.showPerSection) {
        el.setAttribute('data-per-section', 'true');
      }

      // Only CSS custom properties are written inline, never raw dimensions
      // or colors. This keeps theming in the stylesheet.
      el.style.setProperty('--snapdeck-progress-thickness', config.thickness);
      if (config.color) {
        el.style.setProperty('--snapdeck-progress-color', config.color);
      }
      el.style.setProperty('--snapdeck-progress-value', '0');

      const fillEl = document.createElement('div');
      fillEl.className = FILL_CLASS;
      el.appendChild(fillEl);

      document.body.appendChild(el);
      root = el;
      fill = fillEl;

      const subs: Unsubscribe[] = [
        instance.on('afterLoad', () => {
          updateFill();
        }),
        instance.on('afterRender', () => {
          updateFill();
        }),
        instance.on('afterRebuild', () => {
          updateFill();
        }),
      ];
      unsubs = subs;

      // Initial paint so the bar reflects the current section on install.
      updateFill();
    },

    destroy(): void {
      for (const off of unsubs) {
        try {
          off();
        } catch (err) {
          // Swallow per-listener failures; one broken unsubscribe must not
          // block cleanup of the rest.
          // eslint-disable-next-line no-console
          console.error('[progress-bar] unsubscribe failed', err);
        }
      }
      unsubs = [];
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
      }
      root = null;
      fill = null;
      instanceRef = null;
    },
  };
}
