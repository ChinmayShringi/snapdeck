import snapdeck from '@snapdeck/core';
import '@snapdeck/core/css';

const deck = snapdeck('#deck');

deck.on('afterLoad', ({ destination }) => {
  // eslint-disable-next-line no-console
  console.info('on section', destination.index);
});

// Exposed for Playwright E2E tests (apps/e2e). Safe to remove if tests
// are dropped; see apps/e2e/README.md for context.
;(window as unknown as { __snapdeck: typeof deck }).__snapdeck = deck;
