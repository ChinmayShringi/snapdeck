/**
 * Typed instance-scoped event bus with error isolation and cancellation.
 *
 * Audit notes (self-review):
 * - on() returns an unsubscribe fn; duplicate handlers are ignored by Set semantics.
 * - off() is the imperative alternative to calling the returned unsubscribe fn.
 * - once() wraps a handler so it removes itself after the first invocation, but
 *   still forwards its return value so `false` cancellation still works on the
 *   one-and-only call.
 * - emit() never throws from user code. It catches per-handler, logs via
 *   console.error, and continues dispatching remaining handlers. Only an
 *   explicit `false` return triggers cancellation (undefined/true/other values
 *   do not). The iteration uses a snapshot copy so handlers that mutate the
 *   subscription set during dispatch (e.g. once) don't disturb the current emit.
 * - clear() drops all events and all handlers in one call; listenerCount() with
 *   no argument returns the grand total, otherwise count for a single event.
 * - Typing: public API uses the generic `E` map for full IntelliSense. The
 *   internal Set is stored with a loose handler type; the only `any` usage is
 *   isolated to two internal casts documented inline. Public signatures are
 *   fully typed with no `any` leakage.
 */

import type { SnapdeckEvents, Unsubscribe } from '../types.js';

// Loose signature used internally for storage. Public API preserves the precise
// handler type via generics; this is the only place we widen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => unknown;

/**
 * Event map constraint. We use a mapped-type bound rather than
 * `Record<string, ...>` because named interfaces (e.g. `SnapdeckEvents`) have
 * a closed key union, not an index signature. This form still requires every
 * value to be a function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventMap = { readonly [K in keyof unknown]: (...args: any[]) => any };

export class EventBus<E extends EventMap = SnapdeckEvents> {
  private readonly handlers: Map<keyof E, Set<AnyHandler>> = new Map();

  /**
   * Subscribe to an event. Returns an unsubscribe function. Re-adding the same
   * handler reference is a no-op (Set semantics prevent duplicates).
   */
  on<K extends keyof E>(event: K, handler: E[K]): Unsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set<AnyHandler>();
      this.handlers.set(event, set);
    }
    // Cast: storage Set is AnyHandler; E[K] is a compatible function type.
    set.add(handler as unknown as AnyHandler);
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Subscribe for exactly one emission. The internal wrapper removes itself
   * before invoking the user handler, then forwards the return value so a
   * `false` from the once-handler still cancels the emit.
   */
  once<K extends keyof E>(event: K, handler: E[K]): Unsubscribe {
    type Fn = Extract<E[K], AnyHandler>;
    const wrapper = ((...args: Parameters<Fn>): ReturnType<Fn> => {
      this.off(event, wrapper as unknown as E[K]);
      return (handler as unknown as Fn)(...args) as ReturnType<Fn>;
    }) as unknown as E[K];
    return this.on(event, wrapper);
  }

  /**
   * Remove a previously registered handler. Unknown handlers are silently
   * ignored.
   */
  off<K extends keyof E>(event: K, handler: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler as unknown as AnyHandler);
    if (set.size === 0) {
      this.handlers.delete(event);
    }
  }

  /**
   * Dispatch an event to every handler in insertion order. Returns false if
   * any handler returned exactly `false` (cancellation), otherwise true.
   * Handlers that throw are caught and logged; they do not interrupt the rest.
   */
  emit<K extends keyof E>(
    event: K,
    ...args: Parameters<Extract<E[K], AnyHandler>>
  ): boolean {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return true;
    // Snapshot so mutations during dispatch (once wrappers, off in a handler)
    // don't skip or revisit handlers.
    const snapshot = Array.from(set);
    let cancelled = false;
    for (const handler of snapshot) {
      try {
        const result = handler(...args);
        if (result === false) cancelled = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[snapdeck] handler for "${String(event)}" threw:`, err);
      }
    }
    return !cancelled;
  }

  /** Remove every handler for every event. */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Count subscriptions. With no argument, returns the grand total across all
   * events; with an event name, returns that event's count.
   */
  listenerCount<K extends keyof E>(event?: K): number {
    if (event === undefined) {
      let total = 0;
      for (const set of this.handlers.values()) total += set.size;
      return total;
    }
    return this.handlers.get(event)?.size ?? 0;
  }
}
