/**
 * Single-slot command queue with cooperative cancellation.
 *
 * See docs/02-rebuild-recommendations.md Section 9.
 *
 * Contract:
 * - Only one command is in flight at a time (single slot).
 * - Calling `run()` while another command is in flight cancels the in-flight
 *   command and starts the new one. The prior command's `run()` caller receives
 *   the rejection; the new `run()` call does NOT re-surface the prior rejection
 *   (it is swallowed internally).
 * - `cancel()` cancels the in-flight command, if any. The `run()` caller of the
 *   cancelled command receives the rejection from its command's promise.
 * - No global state, no timers.
 */

export interface Cancellable {
  readonly promise: Promise<void>;
  cancel(): void;
}

export class CommandQueue {
  private current: Cancellable | null = null;

  /** True while a command is in flight. */
  get isBusy(): boolean {
    return this.current !== null;
  }

  /**
   * Starts `command`. If another is in flight, cancels it first. Returns a
   * promise that resolves when the newly started command completes, or rejects
   * if this new command is itself cancelled or otherwise rejects.
   *
   * Synchronous semantics: by the time run() returns, `this.current` is the
   * new command (so `isBusy === true`) and any prior command has had cancel()
   * called on it. The new command factory is invoked synchronously, which is
   * what allows the next run() (triggered re-entrantly) to see the correct
   * `current`.
   */
  run(command: () => Cancellable): Promise<void> {
    const prior = this.current;
    if (prior !== null) {
      prior.cancel();
      // Suppress unhandled-rejection for our internal reference. The original
      // run() caller still receives the rejection on their awaited promise.
      prior.promise.catch(() => undefined);
    }

    const started = command();
    this.current = started;

    return (async () => {
      try {
        await started.promise;
      } finally {
        // Only clear the slot if nothing else has taken it in the meantime
        // (e.g. a newer run() replaced current, or a re-entrant run() fired
        // inside this command's rejection unwind).
        if (this.current === started) {
          this.current = null;
        }
      }
    })();
  }

  /** Cancels the in-flight command, if any. Safe to call when idle. */
  cancel(): void {
    const prior = this.current;
    if (prior === null) {
      return;
    }
    // Optimistically clear so a re-entrant run() from the rejection unwind
    // sees an idle queue; the finally-block in run() checks identity and
    // will not clobber a newer slot.
    this.current = null;
    prior.cancel();
  }
}
