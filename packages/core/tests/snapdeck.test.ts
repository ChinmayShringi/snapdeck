/**
 * Audit notes for Snapdeck integrator vs SnapdeckInstance contract in types.ts:
 *
 * - state, activeSection, activeSlide      : implemented; activeSlide returns the active slide of the active section, or null.
 * - moveTo / moveUp / moveDown             : implemented. Return Promise<void>. moveTo supports optional `slide` arg.
 * - moveSlideLeft / moveSlideRight         : IMPLEMENTED. Clamp to [0, slides-1]; emit onSlideLeave (cancellable) + afterSlideLoad.
 * - silentMoveTo                           : implemented; skips animation, callbacks, and queue.
 * - on / off                               : on delegates to EventBus. off is exposed additionally for tests.
 * - setOption / getOption                  : setOption enforces isRuntimeKey. getOption reads frozen options map.
 * - refresh                                : re-runs mountStructure, preserves active index.
 * - destroy                                : idempotent; stops inputs, observers, destroys plugins, tears down DOM, clears bus.
 *
 * Gaps closed in this iteration:
 *  - Gap 1: slide nav + events (onSlideLeave/afterSlideLoad) wired via new animateTransformX.
 *  - Gap 2: fitToSection interpreted as "re-align on resize" — documented in snapdeck.ts header;
 *           see resize observer callback. Partial scroll cannot occur in transform renderer.
 *  - Gap 3: integration tests for wheel, keyboard, pointer, hashchange, ResizeObserver, matchMedia below.
 *  - Gap 4: pre-existing tests preserved; only extended.
 *
 * Remaining intentional gaps (documented, not bugs):
 *  - onScrollOverflow: not emitted. Overflow-aware slides are a post-v1 feature.
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

function buildFixtureWithSlides(
  sectionCount: number,
  slidesPerSection: ReadonlyArray<number>,
  idPrefix = 'deck',
): HTMLElement {
  const deck = document.createElement('div');
  deck.id = idPrefix;
  for (let i = 0; i < sectionCount; i++) {
    const section = document.createElement('section');
    section.setAttribute('data-snapdeck-section', '');
    const n = slidesPerSection[i] ?? 0;
    for (let j = 0; j < n; j++) {
      const slide = document.createElement('div');
      slide.setAttribute('data-snapdeck-slide', '');
      slide.textContent = `S${i + 1}.${j + 1}`;
      section.appendChild(slide);
    }
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

describe('slide navigation', () => {
  it('activeSlide is null when the active section has no slides', () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    expect(deck.activeSlide).toBeNull();
    deck.destroy();
  });

  it('activeSlide returns the first slide of a section with slides', () => {
    buildFixtureWithSlides(2, [3, 0]);
    const deck = snapdeck('#deck');
    expect(deck.activeSlide).not.toBeNull();
    expect(deck.activeSlide?.index).toBe(0);
    deck.destroy();
  });

  it('moveSlideRight advances and emits afterSlideLoad', async () => {
    buildFixtureWithSlides(1, [3]);
    const deck = snapdeck('#deck');
    const after = vi.fn();
    deck.on('afterSlideLoad', after);
    await deck.moveSlideRight();
    expect(deck.state.activeSlidePerSection[0]).toBe(1);
    expect(after).toHaveBeenCalledTimes(1);
    deck.destroy();
  });

  it('moveSlideLeft at index 0 is a no-op', async () => {
    buildFixtureWithSlides(1, [3]);
    const deck = snapdeck('#deck');
    const after = vi.fn();
    deck.on('afterSlideLoad', after);
    await deck.moveSlideLeft();
    expect(deck.state.activeSlidePerSection[0]).toBe(0);
    expect(after).not.toHaveBeenCalled();
    deck.destroy();
  });

  it('moveSlideRight clamps at the last slide', async () => {
    buildFixtureWithSlides(1, [2]);
    const deck = snapdeck('#deck');
    await deck.moveSlideRight();
    await deck.moveSlideRight();
    expect(deck.state.activeSlidePerSection[0]).toBe(1);
    deck.destroy();
  });

  it('moveSlideRight on a section with no slides resolves immediately', async () => {
    buildFixture(2);
    const deck = snapdeck('#deck');
    await expect(deck.moveSlideRight()).resolves.toBeUndefined();
    deck.destroy();
  });

  it('onSlideLeave returning false cancels the slide navigation', async () => {
    buildFixtureWithSlides(1, [3]);
    const deck = snapdeck('#deck');
    const after = vi.fn();
    deck.on('afterSlideLoad', after);
    deck.on('onSlideLeave', () => false);
    await expect(deck.moveSlideRight()).rejects.toThrow();
    expect(deck.state.activeSlidePerSection[0]).toBe(0);
    expect(after).not.toHaveBeenCalled();
    deck.destroy();
  });

  it('moveTo with slide arg selects section then slide', async () => {
    buildFixtureWithSlides(2, [0, 3]);
    const deck = snapdeck('#deck');
    await deck.moveTo(1, 2);
    expect(deck.state.activeSectionIndex).toBe(1);
    expect(deck.state.activeSlidePerSection[1]).toBe(2);
    deck.destroy();
  });

  it('moveTo with slide anchor resolves via data-anchor', async () => {
    const deck = buildFixtureWithSlides(1, [2]);
    const slidesEls = deck.children[0]!.children;
    (slidesEls[1] as HTMLElement).setAttribute('data-anchor', 'two');
    const inst = snapdeck('#deck');
    await inst.moveTo(0, 'two');
    expect(inst.state.activeSlidePerSection[0]).toBe(1);
    inst.destroy();
  });
});

describe('gesture integration: wheel', () => {
  it('wheel down dispatches moveDown', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const container = document.getElementById('deck')!;
    const spy = vi.fn();
    deck.on('afterLoad', spy);
    container.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    deck.destroy();
  });

  it('wheel up at index 0 is swallowed when loopTop is false', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const container = document.getElementById('deck')!;
    container.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(0);
    deck.destroy();
  });

  it('beforeLeave returning false cancels a wheel-triggered move', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const triggers: string[] = [];
    deck.on('beforeLeave', (p) => {
      triggers.push(p.trigger);
      return false;
    });
    const container = document.getElementById('deck')!;
    container.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(triggers).toEqual(['wheel']);
    expect(deck.state.activeSectionIndex).toBe(0);
    deck.destroy();
  });
});

describe('gesture integration: keyboard', () => {
  it('ArrowDown advances the active section', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(1);
    deck.destroy();
  });

  it('ArrowUp at index 0 does nothing', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(0);
    deck.destroy();
  });

  it('End jumps to the last section, Home to first', async () => {
    buildFixture(4);
    const deck = snapdeck('#deck');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(3);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(0);
    deck.destroy();
  });

  it('ArrowRight / ArrowLeft navigate slides when present', async () => {
    buildFixtureWithSlides(1, [3]);
    const deck = snapdeck('#deck');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSlidePerSection[0]).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSlidePerSection[0]).toBe(0);
    deck.destroy();
  });
});

describe('gesture integration: pointer', () => {
  function pointerEvent(type: string, init: Partial<PointerEventInit>): PointerEvent {
    // happy-dom exposes PointerEvent; fall back to Event if not.
    const Ctor = (globalThis as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent;
    if (Ctor) {
      return new Ctor(type, {
        pointerType: 'touch',
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        ...init,
      });
    }
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerType: 'touch', pointerId: 1, ...init });
    return e as unknown as PointerEvent;
  }

  it('synthetic swipe-up triggers moveDown', async () => {
    buildFixture(3);
    const deck = snapdeck('#deck');
    const container = document.getElementById('deck')!;
    // Make threshold small enough: sensitivity is 5% of innerHeight.
    (window as unknown as { innerHeight: number }).innerHeight = 100;
    container.dispatchEvent(pointerEvent('pointerdown', { clientX: 50, clientY: 80 }));
    container.dispatchEvent(pointerEvent('pointermove', { clientX: 50, clientY: 40 }));
    container.dispatchEvent(pointerEvent('pointerup', { clientX: 50, clientY: 40 }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSectionIndex).toBe(1);
    deck.destroy();
  });

  it('synthetic swipe-left triggers slide nav right', async () => {
    buildFixtureWithSlides(1, [3]);
    const deck = snapdeck('#deck');
    const container = document.getElementById('deck')!;
    (window as unknown as { innerWidth: number }).innerWidth = 100;
    (window as unknown as { innerHeight: number }).innerHeight = 100;
    container.dispatchEvent(pointerEvent('pointerdown', { clientX: 80, clientY: 50 }));
    container.dispatchEvent(pointerEvent('pointermove', { clientX: 20, clientY: 50 }));
    container.dispatchEvent(pointerEvent('pointerup', { clientX: 20, clientY: 50 }));
    await new Promise((r) => setTimeout(r, 0));
    expect(deck.state.activeSlidePerSection[0]).toBe(1);
    deck.destroy();
  });
});

describe('hashchange', () => {
  it('updates active section when the URL hash changes', async () => {
    const deck = buildFixture(3);
    setAnchor(deck.children[2] as HTMLElement, 'three');
    const inst = snapdeck('#deck');
    expect(inst.state.activeSectionIndex).toBe(0);
    window.history.replaceState(null, '', '#three');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 0));
    expect(inst.state.activeSectionIndex).toBe(2);
    inst.destroy();
  });
});

describe('ResizeObserver integration', () => {
  it('resize callback re-aligns the active section transform', async () => {
    type ROCb = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
    const ref: { cb: ROCb | null } = { cb: null };
    const stubRO = class {
      constructor(cb: ROCb) {
        ref.cb = cb;
      }
      observe(): void {}
      disconnect(): void {}
    };
    vi.stubGlobal('ResizeObserver', stubRO);
    buildFixture(3);
    const deck = snapdeck('#deck');
    await deck.moveDown();
    expect(ref.cb).not.toBeNull();
    ref.cb?.([{ contentRect: { width: 800, height: 600 } }]);
    await new Promise((r) => setTimeout(r, 150));
    expect(deck.state.width).toBe(800);
    expect(deck.state.height).toBe(600);
    deck.destroy();
    vi.unstubAllGlobals();
  });

  it('resize also re-aligns slide tracks for fitToSection policy', async () => {
    type ROCb = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
    const ref: { cb: ROCb | null } = { cb: null };
    const stubRO = class {
      constructor(cb: ROCb) {
        ref.cb = cb;
      }
      observe(): void {}
      disconnect(): void {}
    };
    vi.stubGlobal('ResizeObserver', stubRO);
    buildFixtureWithSlides(1, [3]);
    const deck = snapdeck('#deck', { fitToSection: true });
    await deck.moveSlideRight();
    ref.cb?.([{ contentRect: { width: 500, height: 400 } }]);
    await new Promise((r) => setTimeout(r, 150));
    const track = document.querySelector('.snapdeck-slides') as HTMLElement;
    expect(track.style.transform).toContain('-500px');
    deck.destroy();
    vi.unstubAllGlobals();
  });

  it('fitToSection=false still constructs cleanly', () => {
    buildFixture(2);
    const deck = snapdeck('#deck', { fitToSection: false });
    expect(deck.getOption('fitToSection')).toBe(false);
    deck.destroy();
  });
});

describe('responsive matchMedia', () => {
  it('matchMedia change flips isResponsive and fires afterResponsive', () => {
    type MMListener = (e: MediaQueryListEvent) => void;
    const capturedRef: { fn: MMListener | null } = { fn: null };
    const originalMM = window.matchMedia;
    window.matchMedia = ((q: string) =>
      ({
        matches: false,
        media: q,
        onchange: null,
        addEventListener: (_t: string, fn: MMListener) => {
          capturedRef.fn = fn;
        },
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as unknown as typeof window.matchMedia;

    buildFixture(2);
    const deck = snapdeck('#deck', { responsiveWidth: 1024 });
    const spy = vi.fn();
    deck.on('afterResponsive', spy);
    expect(capturedRef.fn).not.toBeNull();
    capturedRef.fn?.({ matches: true } as MediaQueryListEvent);
    expect(spy).toHaveBeenCalledWith(true);
    expect(deck.state.isResponsive).toBe(true);
    deck.destroy();
    window.matchMedia = originalMM;
  });
});
