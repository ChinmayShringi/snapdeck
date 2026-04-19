import { describe, expect, it } from 'vitest';
import snapdeck from '../src/index.js';

describe('scaffold smoke', () => {
  it('exports a default factory', () => {
    expect(typeof snapdeck).toBe('function');
  });
});
