/**
 * Audit notes for Snapdeck integrator vs SnapdeckInstance contract in types.ts:
 *
 * - state, activeSection, activeSlide      : implemented (activeSlide returns null; slide tracking is out of scope for v1 integrator).
 * - moveTo / moveUp / moveDown             : implemented. Return Promise<void>.
 * - moveSlideLeft / moveSlideRight         : resolved as no-ops in the minimal integrator (spec Section 3 requires them to exist and be awaitable).
 * - silentMoveTo                           : implemented; skips animation, callbacks, and queue.
 * - on / off                               : on delegates to EventBus. off is exposed additionally for tests.
 * - setOption / getOption                  : setOption enforces isRuntimeKey. getOption reads frozen options map.
 * - refresh                                : re-runs mountStructure, preserves active index.
 * - destroy                                : idempotent; stops inputs, observers, destroys plugins, tears down DOM, clears bus.
 *
 * Known intentional gaps (documented, not bugs):
 *  - Per-slide navigation (moveSlideLeft/Right and active slide state) is not wired; returns resolved promise.
 *  - afterSlideLoad/onSlideLeave/onScrollOverflow events are declared but not emitted by the integrator.
 *  - fitToSection auto-behaviour is unwired (option is accepted but no debounce-to-snap).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import snapdeck, { Snapdeck } from '../src/index.js';
import type { Plugin, SnapdeckInstance } from '../src/types.js';

interface FakeAnimation {
  finished: Promise<void>;
  cancel: () => void;
  commitStyles: () => void;
}

const makeFakeAnim = (): FakeAnimation => ({
  finished: Promise.resolve(),
  cancel: vi.fn(),
  commitStyles: vi.fn(),
});

function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

beforeEach(() => {
  // happy-dom lacks Element.animate; install a stub that resolves synchronously.
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = vi.fn(() =>
    makeFakeAnim(),
  );
  // Reset hash between tests.
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname);
  }
});

afterEach(() => {
  clearBody();
});

function buildFixture(sectionCount: number, idPrefix = 'deck'): HTMLElement {
  const deck = document.createElement('div');
  deck.id = idPrefix;
  for (let i = 0; i < sectionCount; i++) {
    const section = document.createElement('section');
    section.setAttribute('data-snapdeck-section', '');
    const h1 = document.createElement('h1');
    h1.textContent = `Section ${i + 1}`;
    section.appendChild(h1);
    deck.appendChild(section);
  }
  document.body.appendChild(deck);
  return deck;
}

function setAnchor(section: HTMLElement, anchor: string): void {
  section.setAttribute('data-anchor', anchor);
}

describe('snapdeck factory', () => {
  it('returns an instance with the expected shape', () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    expect(deck).toBeInstanceOf(Snapdeck);
    expect(typeof deck.moveTo).toBe('function');
    expect(typeof deck.moveUp).toBe('function');
    expect(typeof deck.moveDown).toBe('function');
    expect(typeof deck.silentMoveTo).toBe('function');
    expect(typeof deck.on).toBe('function');
    expect(typeof deck.destroy).toBe('function');
    deck.destroy();
  });

  it('initial state activates section index 0', () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    expect(deck.state.activeSectionIndex).toBe(0);
    expect(deck.activeSection?.index).toBe(0);
    deck.destroy();
  });
});

describe('navigation', () => {
  it('moveDown advances and fires afterLoad', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const spy = vi.fn();
    deck.on('afterLoad', spy);
    await deck.moveDown();
    expect(deck.state.activeSectionIndex).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    deck.destroy();
  });

  it('moveUp at index 0 does nothing when loopTop=false', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const spy = vi.fn();
    deck.on('afterLoad', spy);
    await deck.moveUp();
    expect(deck.state.activeSectionIndex).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    deck.destroy();
  });

  it('moveUp at index 0 wraps when loopTop=true', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck', { loopTop: true });
    await deck.moveUp();
    expect(deck.state.activeSectionIndex).toBe(2);
    deck.destroy();
  });

  it('moveTo(anchor) resolves anchor to index', async () => {
    const deck = buildFixture(3);
    setAnchor(deck.children[1] as HTMLElement, 'middle');
    const inst = snapdeck('#deck');
    await inst.moveTo('middle');
    expect(inst.state.activeSectionIndex).toBe(1);
    inst.destroy();
  });

  it('moveTo with out-of-range index rejects', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    await expect(deck.moveTo(99)).rejects.toThrow();
    expect(deck.state.activeSectionIndex).toBe(0);
    deck.destroy();
  });

  it('beforeLeave returning false cancels the move', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const afterSpy = vi.fn();
    deck.on('afterLoad', afterSpy);
    deck.on('beforeLeave', () => false);
    await expect(deck.moveDown()).rejects.toThrow();
    expect(deck.state.activeSectionIndex).toBe(0);
    expect(afterSpy).not.toHaveBeenCalled();
    deck.destroy();
  });

  it('rapid moveTo calls: prior animation is cancelled', async () => {
    // Make animate() return a pending finished-promise so cancel() wins the race.
    const pendingAnims: Array<{
      reject: (err: Error) => void;
      resolve: () => void;
      cancel: ReturnType<typeof vi.fn>;
    }> = [];
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = vi.fn(() => {
      let rej!: (err: Error) => void;
      let res!: () => void;
      const finished = new Promise<void>((r, j) => {
        res = r;
        rej = j;
      });
      const cancel = vi.fn(() => {
        const err = new Error('cancel');
        err.name = 'AbortError';
        rej(err);
      });
      const anim = { finished, cancel, commitStyles: vi.fn() };
      pendingAnims.push({ reject: rej, resolve: res, cancel });
      return anim;
    });

    buildFixture(4);
    const deck = snapdeck('#deck');
    const afterSpy = vi.fn();
    deck.on('afterLoad', afterSpy);
    const p1 = deck.moveTo(1);
    // Swallow the expected rejection eagerly so the unhandled-rejection tracker
    // doesn't flag it before the assertion awaits it.
    const p1Caught = p1.catch((e: unknown) => e);
    const p2 = deck.moveTo(2);
    // Resolve the second animation so p2 settles successfully.
    queueMicrotask(() => {
      const last = pendingAnims[pendingAnims.length - 1];
      if (last) last.resolve();
    });
    const p1Result = await p1Caught;
    expect(p1Result).toBeInstanceOf(Error);
    await p2;
    expect(deck.state.activeSectionIndex).toBe(2);
    expect(afterSpy).toHaveBeenCalledTimes(1);
    deck.destroy();
  });
});

describe('silentMoveTo', () => {
  it('updates state without firing beforeLeave/afterLoad', () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const before = vi.fn();
    const after = vi.fn();
    deck.on('beforeLeave', before);
    deck.on('afterLoad', after);
    deck.silentMoveTo(2);
    expect(deck.state.activeSectionIndex).toBe(2);
    expect(before).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    deck.destroy();
  });
});

describe('setOption / getOption', () => {
  it('setOption updates a runtime key', () => {
    buildFixture(2);
    const deck = snapdeck('#deck');
    deck.setOption('scrollingSpeed', 42);
    expect(deck.getOption('scrollingSpeed')).toBe(42);
    deck.destroy();
  });

  it('setOption throws for non-runtime keys', () => {
    buildFixture(2);
    const deck = snapdeck('#deck');
    expect(() =>
      (deck as unknown as { setOption: (k: string, v: unknown) => void }).setOption(
        'sectionSelector',
        '.other',
      ),
    ).toThrow(/not runtime-changeable/);
    deck.destroy();
  });
});

describe('destroy', () => {
  it('tears down DOM and is idempotent', () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    deck.destroy();
    const container = document.getElementById('deck') as HTMLElement;
    expect(container.classList.contains('snapdeck')).toBe(false);
    expect(container.classList.contains('is-initialized')).toBe(false);
    deck.destroy();
  });
});

describe('instance isolation', () => {
  it('two decks on different containers operate independently', async () => {
    buildFixture(3, 'deckA');
    buildFixture(3, 'deckB');
    const a = snapdeck('#deckA');
    const b = snapdeck('#deckB');
    await a.moveDown();
    expect(a.state.activeSectionIndex).toBe(1);
    expect(b.state.activeSectionIndex).toBe(0);
    a.destroy();
    b.destroy();
  });
});

describe('URL hash init', () => {
  it('silently moves to the anchored section on construction', () => {
    const deck = buildFixture(3);
    setAnchor(deck.children[2] as HTMLElement, 'three');
    window.history.replaceState(null, '', '#three');
    const inst = snapdeck('#deck');
    expect(inst.state.activeSectionIndex).toBe(2);
    inst.destroy();
  });
});

describe('reduced motion', () => {
  it('collapses duration to 0 when prefers-reduced-motion is true', async () => {
    const originalMM = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    buildFixture(3);
    const animSpy = vi.fn(() => makeFakeAnim());
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = animSpy;

    const deck = snapdeck('#deck');
    await deck.moveDown();
    expect(animSpy).not.toHaveBeenCalled();
    expect(deck.state.activeSectionIndex).toBe(1);

    deck.destroy();
    window.matchMedia = originalMM;
  });
});

describe('plugins', () => {
  it('installs and destroys plugins with the instance', () => {
    buildFixture(2);
    const installSpy = vi.fn();
    const destroySpy = vi.fn();
    const plugin: Plugin = {
      name: 'test',
      install(inst: SnapdeckInstance) {
        installSpy(inst);
      },
      destroy() {
        destroySpy();
      },
    };
    const deck = snapdeck('#deck', { plugins: [plugin] });
    expect(installSpy).toHaveBeenCalledTimes(1);
    deck.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});

describe('refresh', () => {
  it('re-mounts and preserves active index when possible', () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    deck.silentMoveTo(1);
    expect(deck.state.activeSectionIndex).toBe(1);
    const rebuiltSpy = vi.fn();
    deck.on('afterRebuild', rebuiltSpy);
    deck.refresh();
    expect(rebuiltSpy).toHaveBeenCalledTimes(1);
    expect(deck.state.activeSectionIndex).toBe(1);
    deck.destroy();
  });
});
