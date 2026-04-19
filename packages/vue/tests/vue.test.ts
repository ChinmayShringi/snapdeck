/**
 * Audit notes
 * ===========
 *
 * Scope: @snapdeck/vue composables (useSnapdeck, useSnapdeckEvent).
 *
 * We avoid hitting @snapdeck/core internals by mocking the default export
 * of '@snapdeck/core'. This keeps these tests hermetic: they verify the
 * Vue wiring (ref assignment, onMounted timing, scope-dispose cleanup,
 * provide/inject vs explicit apiRef path) without depending on the
 * engine's DOM contract.
 *
 * happy-dom lacks Element.animate; we stub it defensively anyway so a
 * real core import (e.g. during accidental integration) will not blow up.
 *
 * Coverage target: >= 80% lines/statements on src/use-snapdeck.ts and
 * src/use-snapdeck-event.ts. The index.ts barrel is excluded by config.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, nextTick, provide, ref } from 'vue';
import { mount } from '@vue/test-utils';
import type { SnapdeckInstance } from '@snapdeck/core';

// Stub Element.animate: defensive, in case anything in the chain uses it.
(HTMLElement.prototype as unknown as { animate: () => unknown }).animate =
  () => ({
    finished: Promise.resolve(),
    cancel: () => {},
    commitStyles: () => {},
  });

// --- Mock @snapdeck/core -----------------------------------------------
type Handler = (...args: unknown[]) => unknown;

const handlers = new Map<string, Set<Handler>>();
const destroySpy = vi.fn();
const onSpy = vi.fn((event: string, handler: Handler) => {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => {
    handlers.get(event)?.delete(handler);
  };
});

function makeInstance(): SnapdeckInstance {
  return {
    state: {} as SnapdeckInstance['state'],
    activeSection: null,
    activeSlide: null,
    moveTo: vi.fn(async () => {}),
    moveUp: vi.fn(async () => {}),
    moveDown: vi.fn(async () => {}),
    moveSlideLeft: vi.fn(async () => {}),
    moveSlideRight: vi.fn(async () => {}),
    silentMoveTo: vi.fn(),
    on: onSpy as unknown as SnapdeckInstance['on'],
    setOption: vi.fn(),
    getOption: vi.fn(),
    refresh: vi.fn(),
    destroy: destroySpy,
  } as unknown as SnapdeckInstance;
}

vi.mock('@snapdeck/core', () => {
  return {
    default: vi.fn(() => makeInstance()),
  };
});

// Import AFTER mock so composables resolve to the mocked factory.
import { useSnapdeck, useSnapdeckEvent, SNAPDECK_KEY } from '../src/index.js';
import snapdeckFactory from '@snapdeck/core';

beforeEach(() => {
  handlers.clear();
  destroySpy.mockClear();
  onSpy.mockClear();
  (snapdeckFactory as unknown as ReturnType<typeof vi.fn>).mockClear();
});

// --- Tests --------------------------------------------------------------
describe('useSnapdeck', () => {
  it('assigns containerRef and creates an instance on mount', async () => {
    const captured: {
      containerRef: ReturnType<typeof ref<HTMLElement | null>>;
      api: ReturnType<typeof ref<SnapdeckInstance | null>>;
    } = {
      containerRef: ref(null),
      api: ref(null),
    };

    const Comp = defineComponent({
      setup() {
        const { containerRef, api } = useSnapdeck({ scrollingSpeed: 500 });
        captured.containerRef = containerRef;
        captured.api = api;
        return () =>
          h('div', {
            ref: (el: unknown) => {
              containerRef.value = el as HTMLElement | null;
            },
          });
      },
    });

    const wrapper = mount(Comp);
    await nextTick();

    expect(captured.containerRef.value).not.toBeNull();
    expect(captured.api.value).not.toBeNull();
    expect(snapdeckFactory).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when containerRef is empty', async () => {
    const Comp = defineComponent({
      setup() {
        const { api } = useSnapdeck();
        return () => h('div', {}, String(api.value));
      },
    });

    const wrapper = mount(Comp);
    await nextTick();
    expect(snapdeckFactory).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('useSnapdeckEvent via provide/inject', () => {
  it('subscribes once the instance exists and fires the handler', async () => {
    const spy = vi.fn();

    const Child = defineComponent({
      setup() {
        useSnapdeckEvent('afterLoad', spy);
        return () => h('span');
      },
    });

    const Parent = defineComponent({
      components: { Child },
      setup() {
        const { containerRef } = useSnapdeck();
        return () =>
          h(
            'div',
            {
              ref: (el: unknown) => {
                containerRef.value = el as HTMLElement | null;
              },
            },
            [h(Child)],
          );
      },
    });

    const wrapper = mount(Parent);
    await nextTick();

    // Simulate core emitting 'afterLoad'.
    const set = handlers.get('afterLoad');
    expect(set?.size ?? 0).toBe(1);
    const payload = { origin: 'a', destination: 'b' };
    for (const h of set!) h(payload);
    expect(spy).toHaveBeenCalledWith(payload);

    wrapper.unmount();
    expect(handlers.get('afterLoad')?.size ?? 0).toBe(0);
  });

  it('is a no-op when no provider and no explicit api is supplied', () => {
    const Comp = defineComponent({
      setup() {
        useSnapdeckEvent('afterLoad', vi.fn());
        return () => h('span');
      },
    });
    const wrapper = mount(Comp);
    expect(onSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('useSnapdeckEvent with explicit apiRef', () => {
  it('wires up without provide/inject when api is passed as 3rd arg', async () => {
    const spy = vi.fn();
    const api = ref<SnapdeckInstance | null>(null);

    const Comp = defineComponent({
      setup() {
        useSnapdeckEvent('afterLoad', spy, api);
        return () => h('span');
      },
    });

    const wrapper = mount(Comp);
    // Before assignment: no subscription.
    expect(onSpy).not.toHaveBeenCalled();

    api.value = makeInstance();
    await nextTick();
    expect(onSpy).toHaveBeenCalledTimes(1);

    // Fire event.
    const set = handlers.get('afterLoad');
    const payload = { direction: 'down' };
    for (const h of set!) h(payload);
    expect(spy).toHaveBeenCalledWith(payload);

    // Flip back to null -> unsubscribe.
    api.value = null;
    await nextTick();
    expect(handlers.get('afterLoad')?.size ?? 0).toBe(0);

    wrapper.unmount();
  });
});

describe('SNAPDECK_KEY', () => {
  it('can be used to inject manually', async () => {
    const external = ref<SnapdeckInstance | null>(null);
    const spy = vi.fn();

    const Child = defineComponent({
      setup() {
        useSnapdeckEvent('afterLoad', spy);
        return () => h('span');
      },
    });

    const Parent = defineComponent({
      components: { Child },
      setup() {
        provide(SNAPDECK_KEY, external);
        return () => h('div', [h(Child)]);
      },
    });

    const wrapper = mount(Parent);
    external.value = makeInstance();
    await nextTick();

    const set = handlers.get('afterLoad');
    expect(set?.size).toBe(1);
    for (const h of set!) h({ ok: true });
    expect(spy).toHaveBeenCalledWith({ ok: true });

    wrapper.unmount();
  });
});
