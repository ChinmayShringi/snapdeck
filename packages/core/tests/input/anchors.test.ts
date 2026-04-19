/**
 * Audit notes — anchors input
 * -----------------------------------------------------------------------------
 * Contract under test: attachAnchorsInput from src/input/anchors.ts.
 *
 * Covered behaviour:
 *  - resolveInitial() reads window.location.hash and returns either the
 *    matching section index or -1 (empty hash, or unknown anchor).
 *  - hashchange events look up the anchor in the current sections list
 *    (re-read on every event via getSections) and call onNavigate.
 *  - Unknown anchors on hashchange do NOT call onNavigate.
 *  - onSectionChanged() writes the hash through history.pushState by default,
 *    switches to history.replaceState when recordHistory === false.
 *  - lockAnchors() returning true suppresses the URL write entirely.
 *  - null anchor is a no-op (sections without an anchor never publish a URL).
 *  - Feedback loop guard: after writing, a hashchange whose anchor equals
 *    lastWrittenAnchor is silently dropped; subsequent external changes still
 *    work.
 *  - stop() detaches the listener and is idempotent.
 *  - History API fallback: when pushState/replaceState are missing, hash is
 *    mutated directly, and the resulting synchronous hashchange is guarded.
 *
 * Technique: happy-dom ships a working window/location/history. We attach a
 * fresh handle per test, reset the hash between tests, and rely on
 * `dispatchEvent(new HashChangeEvent('hashchange'))` to simulate navigation
 * because pushState/replaceState do not emit hashchange by design.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Section } from '../../src/types.js';
import {
  attachAnchorsInput,
  type AnchorsInputHandle,
} from '../../src/input/anchors.js';

function makeSection(index: number, anchor: string | null): Section {
  const element = document.createElement('section');
  return {
    index,
    anchor,
    element,
    slides: [],
    isActive: false,
  };
}

function fireHashChange(): void {
  window.dispatchEvent(new Event('hashchange'));
}

function get(list: ReadonlyArray<Section>, index: number): Section {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`section at ${index} missing`);
  }
  return item;
}

describe('attachAnchorsInput', () => {
  let sections: ReadonlyArray<Section>;
  let handle: AnchorsInputHandle | null;

  beforeEach(() => {
    sections = [
      makeSection(0, 'intro'),
      makeSection(1, 'features'),
      makeSection(2, null),
      makeSection(3, 'pricing'),
    ];
    handle = null;
    // Reset hash without triggering a real hashchange on the next test.
    window.history.replaceState(null, '', window.location.pathname);
  });

  afterEach(() => {
    handle?.stop();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('resolveInitial finds section by hash', () => {
    window.history.replaceState(null, '', '#features');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
    });

    expect(handle.resolveInitial()).toBe(1);
  });

  it('resolveInitial returns -1 when no hash', () => {
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
    });

    expect(handle.resolveInitial()).toBe(-1);
  });

  it("resolveInitial returns -1 when hash doesn't match any section", () => {
    window.history.replaceState(null, '', '#nope');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
    });

    expect(handle.resolveInitial()).toBe(-1);
  });

  it('hashchange with known anchor triggers onNavigate', () => {
    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    window.history.replaceState(null, '', '#pricing');
    fireHashChange();

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(3);
  });

  it('hashchange with unknown anchor does not call onNavigate', () => {
    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    window.history.replaceState(null, '', '#mystery');
    fireHashChange();

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('onSectionChanged writes location.hash via pushState by default', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
    });

    handle.onSectionChanged(get(sections, 1));

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(null, '', '#features');
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#features');

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it('recordHistory=false writes via replaceState', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
      recordHistory: false,
    });

    handle.onSectionChanged(get(sections, 0));

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith(null, '', '#intro');
    expect(pushSpy).not.toHaveBeenCalled();

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it('lockAnchors=true suppresses history update', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
      lockAnchors: () => true,
    });

    handle.onSectionChanged(get(sections, 1));

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it('onSectionChanged with null anchor is a no-op', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
    });

    handle.onSectionChanged(get(sections, 2));

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it('self-written hash does not re-trigger onNavigate (feedback guard)', () => {
    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    handle.onSectionChanged(get(sections, 1));
    fireHashChange();

    expect(onNavigate).not.toHaveBeenCalled();

    // An external change to a different anchor still fires.
    window.history.replaceState(null, '', '#pricing');
    fireHashChange();

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(3);
  });

  it('stop() detaches the listener', () => {
    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    handle.stop();
    window.history.replaceState(null, '', '#features');
    fireHashChange();

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('stop() is idempotent', () => {
    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    handle.stop();
    expect(() => handle!.stop()).not.toThrow();

    window.history.replaceState(null, '', '#features');
    fireHashChange();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('onSectionChanged after stop() is a no-op', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate: vi.fn(),
    });

    handle.stop();
    handle.onSectionChanged(get(sections, 1));

    expect(pushSpy).not.toHaveBeenCalled();
    pushSpy.mockRestore();
  });

  it('onSectionChanged when hash already matches records the anchor but skips history', () => {
    window.history.replaceState(null, '', '#features');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    handle.onSectionChanged(get(sections, 1));

    expect(pushSpy).not.toHaveBeenCalled();

    // A subsequent hashchange for the same anchor should be suppressed
    // (guard was armed with the current value).
    fireHashChange();
    expect(onNavigate).not.toHaveBeenCalled();

    pushSpy.mockRestore();
  });

  it('falls back to location.hash assignment when history API is missing', () => {
    const originalHistory = window.history;
    // Simulate a runtime where pushState/replaceState are absent.
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {},
    });

    const onNavigate = vi.fn();
    handle = attachAnchorsInput({
      getSections: () => sections,
      onNavigate,
    });

    handle.onSectionChanged(get(sections, 0));
    expect(window.location.hash).toBe('#intro');

    // Resulting hashchange should be suppressed by the feedback guard.
    fireHashChange();
    expect(onNavigate).not.toHaveBeenCalled();

    Object.defineProperty(window, 'history', {
      configurable: true,
      value: originalHistory,
    });
  });
});
