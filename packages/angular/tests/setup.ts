import 'zone.js';
import '@angular/compiler';

// happy-dom lacks Element.animate; stub it so Snapdeck's scroll engine does
// not throw during tests.
if (
  typeof HTMLElement !== 'undefined' &&
  !(HTMLElement.prototype as unknown as { animate?: unknown }).animate
) {
  (HTMLElement.prototype as unknown as { animate: (...args: unknown[]) => unknown }).animate = () => ({
    finished: Promise.resolve(),
    cancel: () => {},
    commitStyles: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    play: () => {},
    pause: () => {},
  });
}

if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
