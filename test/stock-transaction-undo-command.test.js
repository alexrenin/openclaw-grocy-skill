'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  parseTransactionId,
  runStockTransactionUndoCommand,
} = require('../src/commands/stock-transaction-undo');

test('parses stock transaction id', () => {
  assert.equal(parseTransactionId(' tx-1 '), 'tx-1');
  assert.throws(
    () => parseTransactionId(''),
    /Missing required option: --transaction-id/,
  );
});

test('runs stock-transaction-undo json command', async () => {
  let undoneTransactionId;
  const output = await runStockTransactionUndoCommand({
    format: 'json',
    options: {
      'transaction-id': 'tx-1',
    },
    client: {
      undoStockTransaction: async (transactionId) => {
        undoneTransactionId = transactionId;
        return null;
      },
    },
  });

  assert.equal(undoneTransactionId, 'tx-1');
  assert.equal(output, JSON.stringify({
    action: 'undone',
    entity: 'stock_transaction',
    transaction_id: 'tx-1',
    result: null,
  }, null, 2));
});
