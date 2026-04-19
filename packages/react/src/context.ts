import { createContext } from 'react';
import type { SnapdeckInstance } from '@snapdeck/core';

/**
 * React context that carries the active Snapdeck instance (or null before mount).
 * Consumers use this via `useSnapdeckEvent` to subscribe to instance events
 * without prop-drilling the api.
 */
export const SnapdeckContext = createContext<SnapdeckInstance | null>(null);
