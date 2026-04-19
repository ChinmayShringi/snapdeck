import type { Plugin, SnapdeckInstance } from '@snapdeck/core';

export interface ObserverOptions {
  /**
   * Debounce window in milliseconds applied before calling `instance.refresh()`.
   * Multiple mutations within this window collapse into a single refresh.
   * Default: 100.
   */
  readonly debounceMs?: number;
  /**
   * Optional selector override for what counts as a "section" for the purposes
   * of filtering mutations. When omitted, the plugin reads
   * `instance.getOption('sectionSelector')`.
   */
  readonly sectionSelector?: string;
}

const DEFAULT_DEBOUNCE_MS = 100;

/**
 * MutationObserver-backed auto-refresh plugin for Snapdeck.
 *
 * Watches the Snapdeck container (resolved from the first section's
 * `parentElement`) for direct-child additions/removals that match the section
 * selector. When such a mutation occurs, `instance.refresh()` is called after
 * a debounced delay so that rapid DOM batches collapse into a single refresh.
 *
 * Intentional narrowness:
 *   - `childList: true, subtree: false` only. Never `subtree` or
 *     `characterData` to avoid noisy callbacks.
 *   - Text-only mutations and nested-subtree changes are ignored by the
 *     observer configuration itself.
 *
 * Fallback behavior:
 *   - If `MutationObserver` is not available in the environment, `install` is
 *     a no-op and `destroy` is a no-op. Consumers should fall back to explicit
 *     `instance.refresh()` calls.
 *
 * Container-resolution caveat:
 *   - The public `SnapdeckInstance` interface does not expose the container
 *     element directly. This plugin resolves the container as
 *     `state.sections[0].element.parentElement`. If there are zero sections at
 *     install time, the plugin is a no-op. Consumers with a custom DOM layout
 *     should ensure the first section is a direct child of the intended
 *     container (the standard Snapdeck layout satisfies this).
 */
export function observer(options: ObserverOptions = {}): Plugin {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const selectorOverride = options.sectionSelector;

  let mo: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let instanceRef: SnapdeckInstance | null = null;

  function matchesSection(node: Node, selector: string): boolean {
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return false;
    const el = node as Element;
    if (typeof el.matches !== 'function') return false;
    try {
      return el.matches(selector);
    } catch {
      return false;
    }
  }

  function hasRelevantMutation(
    records: ReadonlyArray<MutationRecord>,
    selector: string,
  ): boolean {
    for (const rec of records) {
      if (rec.type !== 'childList') continue;
      for (let i = 0; i < rec.addedNodes.length; i++) {
        const n = rec.addedNodes.item(i);
        if (n && matchesSection(n, selector)) return true;
      }
      for (let i = 0; i < rec.removedNodes.length; i++) {
        const n = rec.removedNodes.item(i);
        if (n && matchesSection(n, selector)) return true;
      }
    }
    return false;
  }

  function scheduleRefresh(): void {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      const inst = instanceRef;
      if (inst === null) return;
      try {
        inst.refresh();
      } catch (err) {
        // Do not let a refresh throw inside an observer callback chain.
        // Consumers can still observe via their own afterRebuild hook.
        // eslint-disable-next-line no-console
        console.error('[plugin-observer] refresh() threw:', err);
      }
    }, debounceMs);
  }

  return {
    name: 'observer',
    install(instance: SnapdeckInstance): void {
      instanceRef = instance;

      if (typeof MutationObserver === 'undefined') {
        return;
      }

      const sections = instance.state.sections;
      if (sections.length === 0) return;
      const firstSection = sections[0];
      if (!firstSection) return;
      const container = firstSection.element.parentElement;
      if (!container) return;

      const selector =
        selectorOverride ?? instance.getOption('sectionSelector');

      mo = new MutationObserver((records) => {
        if (!hasRelevantMutation(records, selector)) return;
        scheduleRefresh();
      });

      mo.observe(container, {
        childList: true,
        subtree: false,
      });
    },
    destroy(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (mo !== null) {
        mo.disconnect();
        mo = null;
      }
      instanceRef = null;
    },
  };
}
