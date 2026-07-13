'use strict';

const { formatTable } = require('../format-table');

async function runStockCommand({ client, format }) {
  const [stock, quantityUnits] = await Promise.all([
    client.getStock(),
    client.getQuantityUnits(),
  ]);

  const quantityUnitsById = mapById(quantityUnits);
  const rows = normalizeStockItems(stock, quantityUnitsById);

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  return formatTable(rows, [
    { key: 'product_id', label: 'product_id' },
    { key: 'name', label: 'name' },
    { key: 'amount', label: 'amount' },
    { key: 'unit', label: 'unit' },
    { key: 'best_before_date', label: 'best_before_date' },
  ]);
}

function normalizeStockItems(stockItems, quantityUnitsById) {
  return (stockItems || []).map((item) => {
    const product = item.product || {};
    const unit = product.qu_id_stock == null
      ? undefined
      : quantityUnitsById.get(Number(product.qu_id_stock));

    return {
      product_id: item.product_id,
      name: product.name || '',
      amount: item.amount,
      unit: unit?.name || '',
      best_before_date: item.best_before_date || '',
    };
  });
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  runStockCommand,
  normalizeStockItems,
};
