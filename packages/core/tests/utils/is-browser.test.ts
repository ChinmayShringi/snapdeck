import { describe, expect, it } from 'vitest';
import { isBrowser } from '../../src/utils/is-browser.js';

describe('isBrowser', () => {
  it('returns true inside happy-dom', () => {
    expect(isBrowser()).toBe(true);
  });
});
