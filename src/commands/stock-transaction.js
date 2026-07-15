'use strict';

const { parseTransactionId } = require('./stock-transaction-undo');

async function runStockTransactionCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for stock-transaction: ${format}`);
  }

  const transactionId = parseTransactionId(options['transaction-id']);
  const result = await client.getStockTransaction(transactionId);

  return JSON.stringify({
    entity: 'stock_transaction',
    transaction_id: transactionId,
    bookings: result,
  }, null, 2);
}

module.exports = {
  runStockTransactionCommand,
};
