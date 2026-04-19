/**
 * Resolve a user-supplied container target into an HTMLElement.
 *
 * Accepts either a CSS selector string or an HTMLElement reference.
 * Throws a descriptive error when the target cannot be resolved so that
 * mis-configured callers fail fast at boot time.
 */
export function resolveContainer(target: string | HTMLElement): HTMLElement {
  if (typeof target === 'string') {
    if (target.length === 0) {
      throw new Error('[snapdeck] resolveContainer: selector string is empty.');
    }
    const found = document.querySelector(target);
    if (!found) {
      throw new Error(
        `[snapdeck] resolveContainer: no element matches selector "${target}".`,
      );
    }
    if (!(found instanceof HTMLElement)) {
      throw new Error(
        `[snapdeck] resolveContainer: element matching "${target}" is not an HTMLElement.`,
      );
    }
    return found;
  }

  if (target instanceof HTMLElement) {
    return target;
  }

  throw new Error(
    '[snapdeck] resolveContainer: target must be a CSS selector string or an HTMLElement.',
  );
}
