/**
 * Input module barrel.
 *
 * Each input source (wheel, touch, keyboard, anchors) lives in its own file
 * and is re-exported from here. Other input teams will append exports below.
 */

export * from './wheel.js';
export * from './touch.js';
export * from './keyboard.js';
export * from './anchors.js';
