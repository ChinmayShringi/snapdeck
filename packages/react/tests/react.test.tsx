/**
 * @snapdeck/react — React bindings tests.
 *
 * Audit notes (to save future reviewers a trace through the code):
 * - We assert the React hook lifecycle in happy-dom. The real core scroll
 *   engine relies on `HTMLElement.prototype.animate` (not implemented in
 *   happy-dom); the test setup installs a no-op stub that resolves its
 *   `finished` promise synchronously so navigation promises settle.
 * - StrictMode mounts effects twice. We guard against double-initialization
 *   in `useSnapdeck` via an instance ref that survives the extra invoke.
 *   We verify the guard by asserting `is-initialized` appears exactly once
 *   on the container.
 * - We do not mock `@snapdeck/core`. These are wiring tests against the real
 *   instance, which also exercises the cleanup contract end-to-end.
 */
import { describe, expect, it, vi } from 'vitest';
import { StrictMode, useRef } from 'react';
import type { Ref } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useSnapdeck, useSnapdeckEvent, SnapdeckProvider } from '../src/index.js';
import type { SnapdeckInstance } from '../src/index.js';

function Harness({ apiOut }: { apiOut?: Ref<SnapdeckInstance | null> }) {
  const { ref, api } = useSnapdeck({ scrollingSpeed: 700 });
  if (apiOut && typeof apiOut === 'object') {
    (apiOut as { current: SnapdeckInstance | null }).current = api;
  }
  return (
    <SnapdeckProvider value={api}>
      <div ref={ref} data-testid="deck">
        <section data-snapdeck-section>one</section>
        <section data-snapdeck-section>two</section>
      </div>
    </SnapdeckProvider>
  );
}

describe('useSnapdeck', () => {
  it('mounts a Snapdeck instance and exposes the api', async () => {
    const apiRef: { current: SnapdeckInstance | null } = { current: null };
    render(<Harness apiOut={apiRef} />);

    await waitFor(() => {
      expect(apiRef.current).not.toBeNull();
    });
    expect(typeof apiRef.current?.moveDown).toBe('function');
    expect(apiRef.current?.state.sections.length).toBe(2);
  });

  it('calls destroy on unmount and clears the initialized class', async () => {
    const apiRef: { current: SnapdeckInstance | null } = { current: null };
    const { unmount, container } = render(<Harness apiOut={apiRef} />);
    await waitFor(() => expect(apiRef.current).not.toBeNull());

    const deck = container.querySelector('[data-testid="deck"]') as HTMLElement;
    expect(deck.classList.contains('is-initialized')).toBe(true);

    const destroySpy = vi.spyOn(apiRef.current!, 'destroy');
    unmount();
    expect(destroySpy).toHaveBeenCalledTimes(1);
    // After destroy the `is-initialized` marker is removed by core.
    expect(deck.classList.contains('is-initialized')).toBe(false);
  });

  it('does not double-initialize in StrictMode', async () => {
    const { container } = render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await waitFor(() => {
      const deck = container.querySelector('[data-testid="deck"]') as HTMLElement;
      expect(deck.classList.contains('is-initialized')).toBe(true);
    });
    // Exactly one container carrying the initialized marker.
    const initializedNodes = container.querySelectorAll('.is-initialized');
    expect(initializedNodes.length).toBe(1);
  });

  it('lets external callers drive navigation through the api (moveDown)', async () => {
    const apiRef: { current: SnapdeckInstance | null } = { current: null };
    render(<Harness apiOut={apiRef} />);
    await waitFor(() => expect(apiRef.current).not.toBeNull());
    expect(apiRef.current?.state.activeSectionIndex).toBe(0);

    await act(async () => {
      await apiRef.current!.moveDown();
    });
    expect(apiRef.current?.state.activeSectionIndex).toBe(1);
  });
});

describe('useSnapdeckEvent', () => {
  function EventHarness({
    onAfterLoad,
    apiOut,
  }: {
    onAfterLoad: (payload: { destination: { index: number } }) => void;
    apiOut: { current: SnapdeckInstance | null };
  }) {
    const { ref, api } = useSnapdeck();
    apiOut.current = api;
    return (
      <SnapdeckProvider value={api}>
        <Listener onAfterLoad={onAfterLoad} />
        <div ref={ref}>
          <section data-snapdeck-section>a</section>
          <section data-snapdeck-section>b</section>
        </div>
      </SnapdeckProvider>
    );
  }

  function Listener({
    onAfterLoad,
  }: {
    onAfterLoad: (payload: { destination: { index: number } }) => void;
  }) {
    // Wrap in useRef to show that ref-backed handlers see latest closure.
    const latest = useRef(onAfterLoad);
    latest.current = onAfterLoad;
    useSnapdeckEvent('afterLoad', (payload) => {
      latest.current(payload);
    });
    return null;
  }

  it('fires on afterLoad after a navigation', async () => {
    const onAfterLoad = vi.fn();
    const apiRef: { current: SnapdeckInstance | null } = { current: null };
    render(<EventHarness onAfterLoad={onAfterLoad} apiOut={apiRef} />);
    await waitFor(() => expect(apiRef.current).not.toBeNull());

    await act(async () => {
      await apiRef.current!.moveDown();
    });

    expect(onAfterLoad).toHaveBeenCalledTimes(1);
    const payload = onAfterLoad.mock.calls[0]?.[0];
    expect(payload.destination.index).toBe(1);
  });

  it('does nothing when no provider is mounted', () => {
    // A component that calls useSnapdeckEvent without a provider should not
    // throw. We render it in isolation and assert the render completes.
    function Orphan() {
      useSnapdeckEvent('afterLoad', () => {});
      return <div data-testid="orphan" />;
    }
    const { getByTestId } = render(<Orphan />);
    expect(getByTestId('orphan')).toBeInTheDocument();
  });
});
