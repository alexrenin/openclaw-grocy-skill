'use strict';

function runStockTransactionUndoCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for stock-transaction-undo: ${format}`);
  }

  const transactionId = parseTransactionId(options['transaction-id']);

  return client.undoStockTransaction(transactionId)
    .then((result) => JSON.stringify({
      action: 'undone',
      entity: 'stock_transaction',
      transaction_id: transactionId,
      result,
    }, null, 2));
}

function parseTransactionId(value) {
  const transactionId = value == null ? '' : String(value).trim();

  if (!transactionId) {
    throw new Error('Missing required option: --transaction-id');
  }

  return transactionId;
}

module.exports = {
  parseTransactionId,
  runStockTransactionUndoCommand,
};
