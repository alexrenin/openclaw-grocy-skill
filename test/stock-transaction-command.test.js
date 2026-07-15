'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { runStockTransactionCommand } = require('../src/commands/stock-transaction');

test('runs stock-transaction json command', async () => {
  let readTransactionId;
  const output = await runStockTransactionCommand({
    format: 'json',
    options: {
      'transaction-id': 'tx-1',
    },
    client: {
      getStockTransaction: async (transactionId) => {
        readTransactionId = transactionId;
        return [{ id: 1, transaction_id: transactionId }];
      },
    },
  });

  assert.equal(readTransactionId, 'tx-1');
  assert.deepEqual(JSON.parse(output), {
    entity: 'stock_transaction',
    transaction_id: 'tx-1',
    bookings: [{ id: 1, transaction_id: 'tx-1' }],
  });
});
