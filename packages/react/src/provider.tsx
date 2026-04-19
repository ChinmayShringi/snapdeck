import type { ReactNode } from 'react';
import type { SnapdeckInstance } from '@snapdeck/core';
import { SnapdeckContext } from './context.js';

export interface SnapdeckProviderProps {
  readonly value: SnapdeckInstance | null;
  readonly children?: ReactNode;
}

/**
 * Provider that shares a Snapdeck instance with descendant hooks such as
 * {@link useSnapdeckEvent}.
 */
export function SnapdeckProvider({ value, children }: SnapdeckProviderProps) {
  return <SnapdeckContext.Provider value={value}>{children}</SnapdeckContext.Provider>;
}
