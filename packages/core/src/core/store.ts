import type { SnapdeckState, Unsubscribe } from '../types.js';
import type { Action } from './actions.js';
import { createInitialState } from './initial-state.js';
import { reduce } from './reducer.js';

export type StoreListener = (next: SnapdeckState, prev: SnapdeckState) => void;

/**
 * Instance-scoped state container. Not exported on `window`; created in
 * the Snapdeck constructor and passed to collaborators as a dependency.
 */
export class Store {
  private current: SnapdeckState;
  private readonly listeners: Set<StoreListener> = new Set();

  constructor(initial: SnapdeckState = createInitialState()) {
    this.current = initial;
  }

  getState(): SnapdeckState {
    return this.current;
  }

  dispatch(action: Action): void {
    const next = reduce(this.current, action);
    if (next === this.current) return;
    const prev = this.current;
    this.current = next;
    // Snapshot listeners so unsubscribes during emission don't skip neighbours.
    const snapshot = Array.from(this.listeners);
    for (const listener of snapshot) {
      try {
        listener(next, prev);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[snapdeck] store listener threw:', err);
      }
    }
  }

  subscribe(fn: StoreListener): Unsubscribe {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
