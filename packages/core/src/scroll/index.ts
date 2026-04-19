/**
 * Scroll module barrel.
 *
 * Currently exports only the low-level animation engine. Additional
 * modules (queue, navigate) will be added by their respective owners
 * and appended here.
 */

export { animateTransformY } from './engine.js';
export type { AnimateOptions, ScrollAnimation } from './engine.js';
