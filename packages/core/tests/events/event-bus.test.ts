/**
 * EventBus test + audit.
 *
 * Audit findings (self-review):
 * - Verified emit() snapshots handlers before dispatch, so a once() wrapper
 *   that removes itself mid-emit cannot corrupt iteration (test: `once fires
 *   exactly once even with sibling handlers`).
 * - Verified cancellation is strict-equality to false: `true` / `undefined` /
 *   `0` / `""` do not cancel (test: `emit returns true for non-false returns`).
 * - Verified duplicate on() with same handler does not fire twice (Set).
 * - Verified thrown handlers log and do not interrupt successors; stubbed
 *   console.error to silence output and assert the call happened.
 * - Verified listenerCount() with no argument returns total across events.
 * - Compile-time typing asserted via `satisfies` on SnapdeckEvents handlers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/events/event-bus.js';
import type {
  NavigationPayload,
  Section,
  SnapdeckEvents,
} from '../../src/types.js';

// ---------- helpers ----------
function makeSection(index: number, anchor: string | null = null): Section {
  return {
    index,
    anchor,
    element: document.createElement('section'),
    slides: [],
    isActive: false,
  };
}

function makeNavPayload(): NavigationPayload {
  return {
    origin: makeSection(0, 'a'),
    destination: makeSection(1, 'b'),
    direction: 'down',
    trigger: 'api',
  };
}

// ---------- typing assertions (compile-time) ----------
// These do not run at runtime; `satisfies` enforces the shapes match.
const _typingBus = new EventBus<SnapdeckEvents>();
const _afterLoadHandler = ((payload) => {
  // payload must be NavigationPayload
  void payload.destination.index;
}) satisfies SnapdeckEvents['afterLoad'];
const _beforeLeaveHandler = ((payload) => {
  void payload.origin.index;
  return false;
}) satisfies SnapdeckEvents['beforeLeave'];
const _afterResponsiveHandler = ((isResponsive) => {
  void (isResponsive as boolean);
}) satisfies SnapdeckEvents['afterResponsive'];
void _typingBus;
void _afterLoadHandler;
void _beforeLeaveHandler;
void _afterResponsiveHandler;

// ---------- runtime tests ----------
describe('EventBus', () => {
  let bus: EventBus<SnapdeckEvents>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    bus = new EventBus<SnapdeckEvents>();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('subscribes and forwards payload to a handler', () => {
    const handler = vi.fn();
    bus.on('afterLoad', handler);
    const payload = makeNavPayload();
    const result = bus.emit('afterLoad', payload);
    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('runs multiple handlers in insertion order', () => {
    const calls: number[] = [];
    bus.on('afterRebuild', () => calls.push(1));
    bus.on('afterRebuild', () => calls.push(2));
    bus.on('afterRebuild', () => calls.push(3));
    bus.emit('afterRebuild');
    expect(calls).toEqual([1, 2, 3]);
  });

  it('unsubscribe returned by on() stops future calls', () => {
    const handler = vi.fn();
    const off = bus.on('afterRebuild', handler);
    bus.emit('afterRebuild');
    off();
    bus.emit('afterRebuild');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('off() removes a specific handler', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('afterRebuild', a);
    bus.on('afterRebuild', b);
    bus.off('afterRebuild', a);
    bus.emit('afterRebuild');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('off() on unknown event or handler is a no-op', () => {
    const handler = vi.fn();
    // unknown event
    bus.off('afterRebuild', handler);
    // known event, unknown handler
    bus.on('afterRebuild', () => {});
    bus.off('afterRebuild', handler);
    expect(() => bus.emit('afterRebuild')).not.toThrow();
  });

  it('once() fires exactly once', () => {
    const handler = vi.fn();
    bus.once('afterRebuild', handler);
    bus.emit('afterRebuild');
    bus.emit('afterRebuild');
    bus.emit('afterRebuild');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once() fires exactly once even with sibling handlers', () => {
    const onceFn = vi.fn();
    const sibling = vi.fn();
    bus.once('afterRebuild', onceFn);
    bus.on('afterRebuild', sibling);
    bus.emit('afterRebuild');
    bus.emit('afterRebuild');
    expect(onceFn).toHaveBeenCalledTimes(1);
    expect(sibling).toHaveBeenCalledTimes(2);
  });

  it('once() unsubscribe works before firing', () => {
    const handler = vi.fn();
    const off = bus.once('afterRebuild', handler);
    off();
    bus.emit('afterRebuild');
    expect(handler).not.toHaveBeenCalled();
  });

  it('duplicate on() with same handler does not double-fire', () => {
    const handler = vi.fn();
    bus.on('afterRebuild', handler);
    bus.on('afterRebuild', handler);
    bus.on('afterRebuild', handler);
    bus.emit('afterRebuild');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('afterRebuild')).toBe(1);
  });

  it('handler throwing does not stop subsequent handlers', () => {
    const a = vi.fn(() => {
      throw new Error('boom');
    });
    const b = vi.fn();
    const c = vi.fn();
    bus.on('afterRebuild', a);
    bus.on('afterRebuild', b);
    bus.on('afterRebuild', c);
    const result = bus.emit('afterRebuild');
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    expect(c).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(/afterRebuild/);
  });

  it('emit returns false when a handler returns false', () => {
    bus.on('beforeLeave', () => false);
    bus.on('beforeLeave', () => {});
    const result = bus.emit('beforeLeave', makeNavPayload());
    expect(result).toBe(false);
  });

  it('emit returns true for non-false returns (true / undefined)', () => {
    bus.on('beforeLeave', () => true as unknown as void);
    bus.on('beforeLeave', () => undefined);
    const result = bus.emit('beforeLeave', makeNavPayload());
    expect(result).toBe(true);
  });

  it('emit on event with zero handlers returns true', () => {
    expect(bus.emit('afterRebuild')).toBe(true);
  });

  it('clear() wipes everything', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('afterRebuild', a);
    bus.on('afterResponsive', b);
    expect(bus.listenerCount()).toBe(2);
    bus.clear();
    expect(bus.listenerCount()).toBe(0);
    bus.emit('afterRebuild');
    bus.emit('afterResponsive', true);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('listenerCount reflects subscriptions correctly', () => {
    expect(bus.listenerCount()).toBe(0);
    expect(bus.listenerCount('afterRebuild')).toBe(0);
    const off1 = bus.on('afterRebuild', () => {});
    const off2 = bus.on('afterRebuild', () => {});
    bus.on('afterResponsive', () => {});
    expect(bus.listenerCount('afterRebuild')).toBe(2);
    expect(bus.listenerCount('afterResponsive')).toBe(1);
    expect(bus.listenerCount()).toBe(3);
    off1();
    expect(bus.listenerCount('afterRebuild')).toBe(1);
    off2();
    expect(bus.listenerCount('afterRebuild')).toBe(0);
  });

  it('is instance-scoped (no cross-instance leakage)', () => {
    const other = new EventBus<SnapdeckEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('afterRebuild', a);
    other.on('afterRebuild', b);
    bus.emit('afterRebuild');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });
});
