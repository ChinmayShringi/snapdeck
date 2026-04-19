/**
 * Accessible keyboard navigation input.
 *
 * Design notes:
 * - Uses event.key (standardised string), never deprecated keyCode.
 * - Ignores events that originate from editable controls (input, textarea,
 *   contenteditable) so we never hijack user typing.
 * - Ignores events carrying modifier keys (Ctrl/Meta/Alt) so native browser
 *   shortcuts (e.g. Ctrl+End) continue to work. Shift is a semantic modifier
 *   for Space only (Shift+Space = prev).
 * - When disabled() returns true, the module is fully inert.
 * - When isLocked() returns true, we preventDefault to stop the browser
 *   scrolling the page, but we do not emit a command (engine is busy).
 * - stop() detaches the listener and is idempotent.
 */

export type KeyCommand =
  | 'prev'
  | 'next'
  | 'prev-slide'
  | 'next-slide'
  | 'home'
  | 'end';

export interface KeyboardInputOptions {
  readonly target?: HTMLElement | Document | Window;
  readonly onCommand: (command: KeyCommand) => void;
  readonly isLocked?: () => boolean;
  /** when true, module is inert; default false. */
  readonly disabled?: () => boolean;
}

export interface KeyboardInputHandle {
  stop(): void;
}

function isEditableTarget(node: EventTarget | null): boolean {
  if (node === null || !(node instanceof Element)) {
    return false;
  }
  const tag = node.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (node instanceof HTMLElement && node.isContentEditable) {
    return true;
  }
  // Fallback: check the attribute directly. Some environments (e.g. happy-dom)
  // do not compute isContentEditable without a rendered layout.
  const editable = node.getAttribute('contenteditable');
  if (editable !== null && editable !== 'false') {
    return true;
  }
  return false;
}

function mapKeyToCommand(event: KeyboardEvent): KeyCommand | null {
  switch (event.key) {
    case 'ArrowUp':
    case 'PageUp':
      return 'prev';
    case 'ArrowDown':
    case 'PageDown':
      return 'next';
    case 'ArrowLeft':
      return 'prev-slide';
    case 'ArrowRight':
      return 'next-slide';
    case 'Home':
      return 'home';
    case 'End':
      return 'end';
    case ' ':
    case 'Spacebar':
      return event.shiftKey ? 'prev' : 'next';
    default:
      return null;
  }
}

export function attachKeyboardInput(options: KeyboardInputOptions): KeyboardInputHandle {
  const { onCommand, isLocked, disabled } = options;
  const target: EventTarget = options.target ?? document;

  let stopped = false;

  const handler = (event: Event): void => {
    const keyEvent = event as KeyboardEvent;

    if (disabled?.() === true) {
      return;
    }

    if (isEditableTarget(keyEvent.target)) {
      return;
    }

    // Respect non-shift modifiers: never hijack browser shortcuts.
    if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) {
      return;
    }

    const command = mapKeyToCommand(keyEvent);
    if (command === null) {
      return;
    }

    if (isLocked?.() === true) {
      keyEvent.preventDefault();
      return;
    }

    keyEvent.preventDefault();
    onCommand(command);
  };

  target.addEventListener('keydown', handler);

  return {
    stop(): void {
      if (stopped) {
        return;
      }
      stopped = true;
      target.removeEventListener('keydown', handler);
    },
  };
}
