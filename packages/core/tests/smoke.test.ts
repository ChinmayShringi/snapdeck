import { describe, expect, it } from 'vitest';
import snapdeck from '../src/index.js';

describe('scaffold smoke', () => {
  it('exports a default factory', () => {
    expect(typeof snapdeck).toBe('function');
  });

  it('throws a clear not-implemented error until Wave 5 wires it up', () => {
    const div = document.createElement('div');
    expect(() => snapdeck(div)).toThrow(/not yet implemented/i);
  });
});
