/**
 * @snapdeck/vue
 *
 * Vue 3 composables wrapping @snapdeck/core.
 * Composition API only. SSR safe: composables no-op on the server.
 */

export { useSnapdeck, SNAPDECK_KEY } from './use-snapdeck.js';
export type { UseSnapdeckReturn } from './use-snapdeck.js';
export { useSnapdeckEvent } from './use-snapdeck-event.js';
