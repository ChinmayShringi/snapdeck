import snapdeck from '@snapdeck/core';
import '@snapdeck/core/css';

const deck = snapdeck('#deck');

deck.on('afterLoad', ({ destination }) => {
  // eslint-disable-next-line no-console
  console.info('on section', destination.index);
});
