'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildStockSummary,
  formatStockSummaryText,
  getStockAmount,
  runStockSummaryCommand,
} = require('../src/commands/stock-summary');

test('builds stock summary from Grocy stock and volatile categories', () => {
  const summary = buildStockSummary({
    products: [
      { id: 1, active: 1 },
      { id: 2, active: 1 },
      { id: 3, active: 0 },
      { id: 4, active: 1, no_own_stock: 1 },
    ],
    stock: [{
      product_id: 1,
      amount: '2',
      best_before_date: '2026-08-31',
      product: { name: 'Pickles', qu_id_stock: 7 },
    }],
    volatileStock: {
      missing_products: [{ id: 2, name: 'Milk', amount_missing: 1 }],
      due_products: [{ product_id: 1 }],
      overdue_products: [],
      expired_products: [],
    },
    quantityUnitsById: new Map([[7, { id: 7, name: 'pack' }]]),
  });

  assert.deepEqual(summary, {
    counts: {
      configured_products: 2,
      in_stock_products: 1,
      out_of_stock_products: 1,
      below_minimum_products: 1,
      due_soon_products: 1,
      overdue_products: 0,
      expired_products: 0,
    },
    nearest_due: {
      product_id: 1,
      name: 'Pickles',
      amount: 2,
      unit: 'pack',
      best_before_date: '2026-08-31',
    },
  });
});

test('uses aggregated amount for a parent product', () => {
  assert.equal(getStockAmount({
    amount: 0,
    amount_aggregated: '6',
    is_aggregated_amount: 1,
  }), 6);
});

test('ignores never-expiring sentinel when choosing nearest due date', () => {
  const summary = buildStockSummary({
    products: [{ id: 1 }],
    stock: [{
      product_id: 1,
      amount: 1,
      best_before_date: '2999-12-31',
      product: { name: 'Salt', qu_id_stock: 2 },
    }],
    volatileStock: {},
    quantityUnitsById: new Map([[2, { id: 2, name: 'kg' }]]),
  });

  assert.equal(summary.nearest_due, null);
});

test('formats compact Russian text summary', () => {
  const output = formatStockSummaryText({
    counts: {
      configured_products: 3,
      in_stock_products: 1,
      out_of_stock_products: 2,
      below_minimum_products: 1,
      due_soon_products: 1,
      overdue_products: 0,
      expired_products: 0,
    },
    nearest_due: {
      product_id: 1,
      name: 'Milk',
      amount: 0.5,
      unit: 'l',
      best_before_date: '2026-07-20',
    },
  });

  assert.match(output, /Сводка запасов:/);
  assert.match(output, /• В наличии: 1/);
  assert.match(output, /Ближайший срок: Milk — 0\.5 l, 2026-07-20/);
});

test('runs stock-summary as JSON using read-only Grocy methods', async () => {
  const output = await runStockSummaryCommand({
    format: 'json',
    client: {
      getProducts: async () => [{ id: 1 }],
      getStock: async () => [],
      getStockVolatile: async () => ({
        missing_products: [],
        due_products: [],
        overdue_products: [],
        expired_products: [],
      }),
      getQuantityUnits: async () => [],
    },
  });

  assert.deepEqual(JSON.parse(output), {
    counts: {
      configured_products: 1,
      in_stock_products: 0,
      out_of_stock_products: 1,
      below_minimum_products: 0,
      due_soon_products: 0,
      overdue_products: 0,
      expired_products: 0,
    },
    nearest_due: null,
  });
});
