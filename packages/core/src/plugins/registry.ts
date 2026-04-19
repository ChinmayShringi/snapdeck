/**
 * Plugin registry for Snapdeck core.
 *
 * Self-audit (gaps found/fixed during implementation):
 *  - Ensured insertion-order tracking is preserved via a private array (Map iteration order
 *    would also preserve it, but a dedicated array makes reverse iteration explicit).
 *  - destroyAll isolates errors per-plugin so a faulty plugin cannot prevent others from
 *    tearing down. Errors are reported via console.error (only surface allowed here since
 *    core has no logger abstraction yet).
 *  - list() returns a fresh snapshot (slice) to prevent external mutation of internal state.
 *  - Registry is instance-scoped; no module-level state — each SnapdeckInstance creates its
 *    own PluginRegistry.
 *  - Strict TypeScript: no `any`. Uses ReadonlyArray for public shape.
 *  - Guards against duplicate names BEFORE calling install() so a rejected plugin cannot
 *    partially wire itself.
 *  - destroyAll clears the list after attempting all destroys so the registry is safely
 *    reusable (though typical usage is one-shot during instance.destroy()).
 */

import type { Plugin, SnapdeckInstance } from '../types.js';

export class PluginRegistry {
  private readonly plugins: Plugin[] = [];
  private readonly byName: Map<string, Plugin> = new Map();

  constructor() {
    // Intentionally empty; state lives on the instance.
  }

  register(plugin: Plugin, instance: SnapdeckInstance): void {
    if (this.byName.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }
    plugin.install(instance);
    this.plugins.push(plugin);
    this.byName.set(plugin.name, plugin);
  }

  destroyAll(): void {
    for (let i = this.plugins.length - 1; i >= 0; i--) {
      const plugin = this.plugins[i];
      if (!plugin) continue;
      try {
        plugin.destroy();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Plugin "${plugin.name}" threw during destroy():`, error);
      }
    }
    this.plugins.length = 0;
    this.byName.clear();
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  get(name: string): Plugin | undefined {
    return this.byName.get(name);
  }

  list(): ReadonlyArray<Plugin> {
    return this.plugins.slice();
  }
}

/**
 * Identity helper for defining plugins with improved type inference at the call site.
 * Usage: `export const myPlugin = definePlugin({ name: 'my', install(...) {}, destroy() {} });`
 */
export function definePlugin<T extends Plugin>(p: T): T {
  return p;
}
