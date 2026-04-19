/**
 * CommandQueue test + audit.
 *
 * Audit findings (self-review):
 * - Verified isBusy flips true on run() entry and false after the command's
 *   promise settles.
 * - Verified that a second run() while busy cancels the prior Cancellable
 *   (cancel spy called exactly once) and the first run()'s returned promise
 *   rejects with the cancellation error produced by the prior command.
 * - Verified the second run() itself resolves cleanly when its command
 *   resolves, even though the prior rejection happened internally (proves
 *   the queue swallows the prior rejection on its own reference).
 * - Verified cancel() on an idle queue is a no-op (no throw, isBusy stays
 *   false).
 * - Verified cancel() while busy rejects the pending run().
 * - Verified run() called synchronously after cancel() starts fresh and is
 *   not confused by the prior slot (identity check in finally{}).
 * - Verified rapid run() calls: only the last one's promise resolves on the
 *   last command's resolution; earlier ones reject.
 * - Verified re-entrant run() fired during a rejection unwind does not get
 *   clobbered by the outer finally{}.
 *
 * Coverage: targets 100% line/branch on command-queue.ts.
 */

import { describe, expect, it, vi } from 'vitest';
import { CommandQueue, type Cancellable } from '../../src/queue/index.js';

// ---------- helpers ----------
interface MockCancellable extends Cancellable {
  cancel: ReturnType<typeof vi.fn>;
  resolveFn: () => void;
  rejectFn: (err: unknown) => void;
  readonly cancelled: boolean;
}

function makeCancellable(): MockCancellable {
  let resolveFn!: () => void;
  let rejectFn!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolveFn = res;
    rejectFn = rej;
  });
  let cancelled = false;
  const cancel = vi.fn(() => {
    cancelled = true;
    rejectFn(new DOMException('cancelled', 'AbortError'));
  });
  return {
    promise,
    cancel,
    resolveFn: () => resolveFn(),
    rejectFn,
    get cancelled() {
      return cancelled;
    },
  };
}

// A tiny async yield so microtasks drain.
const flush = () => new Promise<void>((r) => queueMicrotask(r));

describe('CommandQueue', () => {
  it('starts command and isBusy is true until completion', async () => {
    const q = new CommandQueue();
    const c = makeCancellable();
    expect(q.isBusy).toBe(false);

    const p = q.run(() => c);
    expect(q.isBusy).toBe(true);

    c.resolveFn();
    await p;
    expect(q.isBusy).toBe(false);
  });

  it('isBusy false after resolution', async () => {
    const q = new CommandQueue();
    const c = makeCancellable();
    const p = q.run(() => c);
    c.resolveFn();
    await p;
    expect(q.isBusy).toBe(false);
  });

  it('run() while busy cancels previous command', async () => {
    const q = new CommandQueue();
    const first = makeCancellable();
    const second = makeCancellable();

    const p1 = q.run(() => first);
    // fire-and-forget second; it will cancel first
    const p2 = q.run(() => second);

    // p1 should reject due to cancellation
    await expect(p1).rejects.toBeInstanceOf(DOMException);
    expect(first.cancel).toHaveBeenCalledTimes(1);
    expect(first.cancelled).toBe(true);

    second.resolveFn();
    await expect(p2).resolves.toBeUndefined();
  });

  it("previous command's caller receives rejection", async () => {
    const q = new CommandQueue();
    const first = makeCancellable();
    const second = makeCancellable();

    const p1 = q.run(() => first);
    const p2 = q.run(() => second);

    await expect(p1).rejects.toMatchObject({ name: 'AbortError' });
    second.resolveFn();
    await p2;
  });

  it('queue becomes idle after new command finishes', async () => {
    const q = new CommandQueue();
    const first = makeCancellable();
    const second = makeCancellable();

    const p1 = q.run(() => first);
    const p2 = q.run(() => second);
    await expect(p1).rejects.toBeDefined();

    expect(q.isBusy).toBe(true);
    second.resolveFn();
    await p2;
    expect(q.isBusy).toBe(false);
  });

  it('cancel() when idle does nothing', () => {
    const q = new CommandQueue();
    expect(() => q.cancel()).not.toThrow();
    expect(q.isBusy).toBe(false);
  });

  it('cancel() when busy cancels in-flight', async () => {
    const q = new CommandQueue();
    const c = makeCancellable();
    const p = q.run(() => c);
    expect(q.isBusy).toBe(true);

    q.cancel();
    expect(c.cancel).toHaveBeenCalledTimes(1);
    await expect(p).rejects.toBeInstanceOf(DOMException);
    expect(q.isBusy).toBe(false);
  });

  it('run() can be called immediately after cancel()', async () => {
    const q = new CommandQueue();
    const first = makeCancellable();
    const second = makeCancellable();

    const p1 = q.run(() => first);
    q.cancel();
    const p2 = q.run(() => second);

    await expect(p1).rejects.toBeDefined();
    expect(q.isBusy).toBe(true);

    second.resolveFn();
    await expect(p2).resolves.toBeUndefined();
    expect(q.isBusy).toBe(false);
  });

  it('two rapid run() calls: only the last one resolves on completion', async () => {
    const q = new CommandQueue();
    const a = makeCancellable();
    const b = makeCancellable();
    const c = makeCancellable();

    const pA = q.run(() => a);
    const pB = q.run(() => b);
    const pC = q.run(() => c);

    await expect(pA).rejects.toBeDefined();
    await expect(pB).rejects.toBeDefined();

    expect(a.cancel).toHaveBeenCalledTimes(1);
    expect(b.cancel).toHaveBeenCalledTimes(1);
    expect(c.cancel).not.toHaveBeenCalled();

    c.resolveFn();
    await expect(pC).resolves.toBeUndefined();
    expect(q.isBusy).toBe(false);
  });

  it('re-entrant run() during rejection unwind does not get clobbered', async () => {
    const q = new CommandQueue();
    const first = makeCancellable();
    const second = makeCancellable();

    const p1 = q.run(() => first);

    // When p1 rejects, synchronously start a new run() inside the catch.
    const reentrant = p1.catch(() => q.run(() => second));

    q.cancel();
    // After cancel, p1 should reject and the re-entrant run() should be busy.
    await flush();
    await flush();

    // The second command should now be in flight (not clobbered by p1 finally).
    expect(q.isBusy).toBe(true);
    second.resolveFn();
    await reentrant;
    expect(q.isBusy).toBe(false);
  });

  it('command that rejects on its own (not via cancel) surfaces to run() caller', async () => {
    const q = new CommandQueue();
    const c = makeCancellable();
    const p = q.run(() => c);

    c.rejectFn(new Error('boom'));
    await expect(p).rejects.toThrow('boom');
    expect(q.isBusy).toBe(false);
  });
});
