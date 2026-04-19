import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginRegistry, definePlugin } from '../../src/plugins/registry.js';
import type { Plugin, SnapdeckInstance } from '../../src/types.js';

const instance = {} as SnapdeckInstance;

function makePlugin(
  name: string,
  overrides: Partial<Pick<Plugin, 'install' | 'destroy'>> = {},
): Plugin {
  return {
    name,
    install: overrides.install ?? vi.fn(),
    destroy: overrides.destroy ?? vi.fn(),
  };
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('register installs the plugin and calls install() with the instance', () => {
    const install = vi.fn();
    const plugin = makePlugin('a', { install });

    registry.register(plugin, instance);

    expect(install).toHaveBeenCalledTimes(1);
    expect(install).toHaveBeenCalledWith(instance);
    expect(registry.has('a')).toBe(true);
  });

  it('throws when registering a duplicate name and does not call install again', () => {
    const first = makePlugin('dup');
    const secondInstall = vi.fn();
    const second = makePlugin('dup', { install: secondInstall });

    registry.register(first, instance);

    expect(() => registry.register(second, instance)).toThrow(/already registered/i);
    expect(secondInstall).not.toHaveBeenCalled();
    expect(registry.list()).toHaveLength(1);
  });

  it('destroyAll calls destroy() on every plugin in reverse insertion order', () => {
    const order: string[] = [];
    const a = makePlugin('a', { destroy: () => void order.push('a') });
    const b = makePlugin('b', { destroy: () => void order.push('b') });
    const c = makePlugin('c', { destroy: () => void order.push('c') });

    registry.register(a, instance);
    registry.register(b, instance);
    registry.register(c, instance);

    registry.destroyAll();

    expect(order).toEqual(['c', 'b', 'a']);
  });

  it('destroyAll clears the list afterwards', () => {
    registry.register(makePlugin('a'), instance);
    registry.register(makePlugin('b'), instance);

    registry.destroyAll();

    expect(registry.list()).toEqual([]);
    expect(registry.has('a')).toBe(false);
    expect(registry.get('b')).toBeUndefined();
  });

  it('one plugin throwing in destroy does not stop others and is logged', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const aDestroy = vi.fn();
    const bDestroy = vi.fn(() => {
      throw new Error('boom');
    });
    const cDestroy = vi.fn();

    registry.register(makePlugin('a', { destroy: aDestroy }), instance);
    registry.register(makePlugin('b', { destroy: bDestroy }), instance);
    registry.register(makePlugin('c', { destroy: cDestroy }), instance);

    expect(() => registry.destroyAll()).not.toThrow();

    expect(cDestroy).toHaveBeenCalledTimes(1);
    expect(bDestroy).toHaveBeenCalledTimes(1);
    expect(aDestroy).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(errSpy.mock.calls[0]?.[0]).toMatch(/"b"/);
  });

  it('has/get/list behave correctly', () => {
    const a = makePlugin('a');
    const b = makePlugin('b');

    registry.register(a, instance);
    registry.register(b, instance);

    expect(registry.has('a')).toBe(true);
    expect(registry.has('missing')).toBe(false);
    expect(registry.get('a')).toBe(a);
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.list()).toEqual([a, b]);
  });

  it('list returns a snapshot — mutating the returned array does not affect the registry', () => {
    const a = makePlugin('a');
    registry.register(a, instance);

    const snapshot = registry.list() as Plugin[];
    snapshot.pop();
    snapshot.push(makePlugin('injected'));

    expect(registry.list()).toEqual([a]);
    expect(registry.has('injected')).toBe(false);
  });

  it('definePlugin is identity and preserves type', () => {
    const input = {
      name: 'typed',
      install: vi.fn(),
      destroy: vi.fn(),
      custom: 42 as const,
    };

    const result = definePlugin(input);

    expect(result).toBe(input);
    // Type check: custom is preserved via the generic T extends Plugin constraint.
    const n: 42 = result.custom;
    expect(n).toBe(42);
  });
});
