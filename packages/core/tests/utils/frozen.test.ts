import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../../src/utils/frozen.js';

describe('deepFreeze', () => {
  it('freezes a flat object', () => {
    const o = deepFreeze({ a: 1, b: 2 });
    expect(Object.isFrozen(o)).toBe(true);
  });

  it('freezes nested objects and arrays at every depth', () => {
    const input = {
      a: { b: { c: [1, 2, { d: 'x' }] } },
      list: [{ k: 'v' }],
    };
    const o = deepFreeze(input);
    expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(o.a)).toBe(true);
    expect(Object.isFrozen(o.a.b)).toBe(true);
    expect(Object.isFrozen(o.a.b.c)).toBe(true);
    expect(Object.isFrozen(o.a.b.c[2])).toBe(true);
    expect(Object.isFrozen(o.list)).toBe(true);
    expect(Object.isFrozen(o.list[0])).toBe(true);
  });

  it('returns the same reference', () => {
    const input = { a: 1 };
    expect(deepFreeze(input)).toBe(input);
  });

  it('handles cycles without infinite recursion', () => {
    type Node = { name: string; self?: Node };
    const a: Node = { name: 'a' };
    a.self = a;
    const out = deepFreeze(a);
    expect(Object.isFrozen(out)).toBe(true);
    expect(out.self).toBe(out);
  });

  it('skips already-frozen inputs (idempotent)', () => {
    const o = Object.freeze({ a: 1 });
    expect(() => deepFreeze(o)).not.toThrow();
    expect(deepFreeze(o)).toBe(o);
  });

  it('does not attempt to freeze functions, Dates, Maps, or Sets in containers', () => {
    const fn = () => 0;
    const date = new Date(0);
    const map = new Map([['k', 1]]);
    const set = new Set([1]);
    const bag = { fn, date, map, set };
    deepFreeze(bag);
    expect(Object.isFrozen(bag)).toBe(true);
    expect(Object.isFrozen(fn)).toBe(false);
    expect(Object.isFrozen(date)).toBe(false);
    expect(Object.isFrozen(map)).toBe(false);
    expect(Object.isFrozen(set)).toBe(false);
    // Map/Set remain mutable
    map.set('k2', 2);
    set.add(2);
    expect(map.get('k2')).toBe(2);
    expect(set.has(2)).toBe(true);
  });

  it('accepts primitives unchanged', () => {
    expect(deepFreeze(42 as unknown as object)).toBe(42);
    expect(deepFreeze('s' as unknown as object)).toBe('s');
    expect(deepFreeze(null as unknown as object)).toBe(null);
  });
});
