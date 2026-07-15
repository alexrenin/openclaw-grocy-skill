'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatLowStockText,
  normalizeLowStockItems,
  runStockLowCommand,
} = require('../src/commands/stock-low');

test('normalizes low-stock products with stock units and configured minimums', () => {
  const rows = normalizeLowStockItems(
    [
      { id: 2, name: 'Milk', amount_missing: '1.5', is_partly_in_stock: '1' },
      { id: 1, name: 'Flour', amount_missing: 2, is_partly_in_stock: 0 },
    ],
    new Map([
      [1, { id: 1, name: 'Flour', qu_id_stock: 3, min_stock_amount: '2' }],
      [2, { id: 2, name: 'Milk', qu_id_stock: 4, min_stock_amount: '3' }],
    ]),
    new Map([
      [3, { id: 3, name: 'kg' }],
      [4, { id: 4, name: 'l' }],
    ]),
  );

  assert.deepEqual(rows, [
    {
      product_id: 1,
      name: 'Flour',
      amount_missing: 2,
      unit: 'kg',
      minimum_stock_amount: 2,
      is_partly_in_stock: false,
    },
    {
      product_id: 2,
      name: 'Milk',
      amount_missing: 1.5,
      unit: 'l',
      minimum_stock_amount: 3,
      is_partly_in_stock: true,
    },
  ]);
});

test('formats low-stock products as compact Russian text', () => {
  const output = formatLowStockText([{
    product_id: 2,
    name: 'Milk',
    amount_missing: 1.5,
    unit: 'l',
    minimum_stock_amount: 3,
    is_partly_in_stock: true,
  }]);

  assert.match(output, /Ниже минимального запаса:/);
  assert.match(output, /• Milk — не хватает 1\.5 l \(частично в наличии\)/);
});

test('formats an empty low-stock list', () => {
  assert.equal(formatLowStockText([]), 'Товаров ниже минимального запаса нет.');
});

test('runs stock-low as JSON using read-only Grocy methods', async () => {
  const output = await runStockLowCommand({
    format: 'json',
    client: {
      getStockVolatile: async () => ({
        missing_products: [{ id: 2, name: 'Milk', amount_missing: 1, is_partly_in_stock: 0 }],
      }),
      getProducts: async () => [{ id: 2, name: 'Milk', qu_id_stock: 4, min_stock_amount: 1 }],
      getQuantityUnits: async () => [{ id: 4, name: 'l' }],
    },
  });

  assert.deepEqual(JSON.parse(output), [{
    product_id: 2,
    name: 'Milk',
    amount_missing: 1,
    unit: 'l',
    minimum_stock_amount: 1,
    is_partly_in_stock: false,
  }]);
});

test('runs stock-low as a table', async () => {
  const output = await runStockLowCommand({
    format: 'table',
    client: {
      getStockVolatile: async () => ({
        missing_products: [{ id: 2, name: 'Milk', amount_missing: 1, is_partly_in_stock: 0 }],
      }),
      getProducts: async () => [{ id: 2, name: 'Milk', qu_id_stock: 4, min_stock_amount: 1 }],
      getQuantityUnits: async () => [{ id: 4, name: 'l' }],
    },
  });

  assert.match(output, /product_id/);
  assert.match(output, /amount_missing/);
  assert.match(output, /minimum_stock_amount/);
});
