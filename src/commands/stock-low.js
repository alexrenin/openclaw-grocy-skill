'use strict';

const { formatTable } = require('../format-table');

async function runStockLowCommand({ client, format }) {
  const [volatileStock, products, quantityUnits] = await Promise.all([
    client.getStockVolatile(),
    client.getProducts(),
    client.getQuantityUnits(),
  ]);

  const rows = normalizeLowStockItems(
    volatileStock?.missing_products,
    mapById(products),
    mapById(quantityUnits),
  );

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  if (format === 'table') {
    return formatTable(rows, [
      { key: 'product_id', label: 'product_id' },
      { key: 'name', label: 'name' },
      { key: 'amount_missing', label: 'amount_missing' },
      { key: 'unit', label: 'unit' },
      { key: 'minimum_stock_amount', label: 'minimum_stock_amount' },
      { key: 'is_partly_in_stock', label: 'is_partly_in_stock' },
    ]);
  }

  return formatLowStockText(rows);
}

function normalizeLowStockItems(missingProducts, productsById, quantityUnitsById) {
  return (missingProducts || [])
    .map((item) => {
      const product = productsById.get(Number(item.id)) || {};
      const unit = quantityUnitsById.get(Number(product.qu_id_stock));

      return {
        product_id: item.id,
        name: item.name || product.name || '',
        amount_missing: toNumberOrNull(item.amount_missing),
        unit: unit?.name || '',
        minimum_stock_amount: toNumberOrNull(product.min_stock_amount),
        is_partly_in_stock: isTruthyFlag(item.is_partly_in_stock),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
}

function formatLowStockText(rows) {
  if (!rows || rows.length === 0) {
    return 'Товаров ниже минимального запаса нет.';
  }

  const lines = ['Ниже минимального запаса:', ''];

  for (const row of rows) {
    const amount = [formatNumber(row.amount_missing), row.unit].filter(Boolean).join(' ');
    const partlyInStock = row.is_partly_in_stock ? ' (частично в наличии)' : '';
    lines.push(`• ${row.name} — не хватает ${amount}${partlyInStock}`);
  }

  return lines.join('\n');
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function formatNumber(value) {
  return Number.isFinite(value) ? String(value) : '?';
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  formatLowStockText,
  normalizeLowStockItems,
  runStockLowCommand,
};
