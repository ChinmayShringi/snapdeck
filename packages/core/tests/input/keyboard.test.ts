/**
 * Audit notes — keyboard input
 * -----------------------------------------------------------------------------
 * Contract under test: attachKeyboardInput from src/input/keyboard.ts.
 *
 * Covered behaviour:
 *  - Key -> command mapping for every documented key (ArrowUp/Down/Left/Right,
 *    PageUp/Down, Home, End, Space, Shift+Space).
 *  - Modifier keys (Ctrl/Meta/Alt) suppress all handling so browser shortcuts
 *    (e.g. Cmd+ArrowDown on macOS) keep working.
 *  - Editable targets (INPUT, TEXTAREA, contenteditable) are ignored so typing
 *    is never hijacked (a11y).
 *  - disabled() returning true makes the module completely inert (no
 *    preventDefault, no command).
 *  - isLocked() returning true calls preventDefault (to block browser scroll)
 *    but emits no command.
 *  - Keys we do not handle (e.g. 'a') pass through untouched.
 *  - stop() detaches the keydown listener and is idempotent.
 *
 * Technique: tests attach to `document` (the default target) and dispatch
 * KeyboardEvent instances with { bubbles: true, cancelable: true }. We
 * inspect event.defaultPrevented after dispatch to verify preventDefault
 * behaviour without mocking the event object.
 *
 * Uncovered (by design): keyboard layouts / IME composition events, since
 * the contract is explicitly keyed off event.key.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachKeyboardInput,
  type KeyCommand,
  type KeyboardInputHandle,
} from '../../src/input/keyboard.js';

interface KeyInit {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

function makeKeyEvent(init: KeyInit): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: init.key,
    shiftKey: init.shiftKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    altKey: init.altKey ?? false,
    bubbles: true,
    cancelable: true,
  });
}

function dispatchOn(target: EventTarget, init: KeyInit): KeyboardEvent {
  const event = makeKeyEvent(init);
  target.dispatchEvent(event);
  return event;
}

describe('attachKeyboardInput', () => {
  let handle: KeyboardInputHandle | null = null;
  let onCommand: ReturnType<typeof vi.fn<(command: KeyCommand) => void>>;
  const addedNodes: Element[] = [];

  function addNode<T extends Element>(node: T): T {
    document.body.appendChild(node);
    addedNodes.push(node);
    return node;
  }

  beforeEach(() => {
    onCommand = vi.fn();
  });

  afterEach(() => {
    handle?.stop();
    handle = null;
    while (addedNodes.length > 0) {
      addedNodes.pop()?.remove();
    }
  });

  it('maps ArrowDown to "next" and ArrowUp to "prev"', () => {
    handle = attachKeyboardInput({ onCommand });

    const down = dispatchOn(document, { key: 'ArrowDown' });
    const up = dispatchOn(document, { key: 'ArrowUp' });

    expect(onCommand).toHaveBeenNthCalledWith(1, 'next');
    expect(onCommand).toHaveBeenNthCalledWith(2, 'prev');
    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
  });

  it('maps PageDown to "next" and PageUp to "prev"', () => {
    handle = attachKeyboardInput({ onCommand });

    dispatchOn(document, { key: 'PageDown' });
    dispatchOn(document, { key: 'PageUp' });

    expect(onCommand).toHaveBeenNthCalledWith(1, 'next');
    expect(onCommand).toHaveBeenNthCalledWith(2, 'prev');
  });

  it('maps Home/End to "home"/"end"', () => {
    handle = attachKeyboardInput({ onCommand });

    dispatchOn(document, { key: 'Home' });
    dispatchOn(document, { key: 'End' });

    expect(onCommand).toHaveBeenNthCalledWith(1, 'home');
    expect(onCommand).toHaveBeenNthCalledWith(2, 'end');
  });

  it('maps ArrowLeft/ArrowRight to slide commands', () => {
    handle = attachKeyboardInput({ onCommand });

    dispatchOn(document, { key: 'ArrowLeft' });
    dispatchOn(document, { key: 'ArrowRight' });

    expect(onCommand).toHaveBeenNthCalledWith(1, 'prev-slide');
    expect(onCommand).toHaveBeenNthCalledWith(2, 'next-slide');
  });

  it('Space maps to "next"; Shift+Space maps to "prev"', () => {
    handle = attachKeyboardInput({ onCommand });

    dispatchOn(document, { key: ' ' });
    dispatchOn(document, { key: ' ', shiftKey: true });

    expect(onCommand).toHaveBeenNthCalledWith(1, 'next');
    expect(onCommand).toHaveBeenNthCalledWith(2, 'prev');
  });

  it('ignores ArrowDown when Ctrl/Meta/Alt is held (browser shortcuts pass through)', () => {
    handle = attachKeyboardInput({ onCommand });

    const ctrl = dispatchOn(document, { key: 'ArrowDown', ctrlKey: true });
    const meta = dispatchOn(document, { key: 'ArrowDown', metaKey: true });
    const alt = dispatchOn(document, { key: 'ArrowDown', altKey: true });

    expect(onCommand).not.toHaveBeenCalled();
    expect(ctrl.defaultPrevented).toBe(false);
    expect(meta.defaultPrevented).toBe(false);
    expect(alt.defaultPrevented).toBe(false);
  });

  it('ignores keys dispatched from an <input> target', () => {
    handle = attachKeyboardInput({ onCommand });

    const input = addNode(document.createElement('input'));

    const event = makeKeyEvent({ key: 'ArrowDown' });
    input.dispatchEvent(event);

    expect(onCommand).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys dispatched from a <textarea> target', () => {
    handle = attachKeyboardInput({ onCommand });

    const textarea = addNode(document.createElement('textarea'));

    const event = makeKeyEvent({ key: 'ArrowDown' });
    textarea.dispatchEvent(event);

    expect(onCommand).not.toHaveBeenCalled();
  });

  it('ignores keys dispatched from a contenteditable element', () => {
    handle = attachKeyboardInput({ onCommand });

    const div = addNode(document.createElement('div'));
    div.setAttribute('contenteditable', 'true');

    const event = makeKeyEvent({ key: 'ArrowDown' });
    div.dispatchEvent(event);

    expect(onCommand).not.toHaveBeenCalled();
  });

  it('does nothing when disabled() returns true', () => {
    handle = attachKeyboardInput({ onCommand, disabled: () => true });

    const event = dispatchOn(document, { key: 'ArrowDown' });

    expect(onCommand).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('calls preventDefault but emits no command when isLocked() returns true', () => {
    handle = attachKeyboardInput({ onCommand, isLocked: () => true });

    const event = dispatchOn(document, { key: 'ArrowDown' });

    expect(onCommand).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores unrelated keys like "a"', () => {
    handle = attachKeyboardInput({ onCommand });

    const event = dispatchOn(document, { key: 'a' });

    expect(onCommand).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('stop() detaches the listener and is idempotent', () => {
    handle = attachKeyboardInput({ onCommand });

    dispatchOn(document, { key: 'ArrowDown' });
    expect(onCommand).toHaveBeenCalledTimes(1);

    handle.stop();
    handle.stop(); // idempotent

    dispatchOn(document, { key: 'ArrowDown' });
    expect(onCommand).toHaveBeenCalledTimes(1);
  });

  it('accepts a custom target element', () => {
    const target = addNode(document.createElement('div'));

    handle = attachKeyboardInput({ target, onCommand });

    // Event on document should NOT trigger.
    dispatchOn(document, { key: 'ArrowDown' });
    expect(onCommand).not.toHaveBeenCalled();

    // Event on the custom target should.
    target.dispatchEvent(makeKeyEvent({ key: 'ArrowDown' }));
    expect(onCommand).toHaveBeenCalledWith('next');
  });
});
