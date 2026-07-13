'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeStockItems, runStockCommand } = require('../src/commands/stock');

test('normalizes stock items using product stock unit', () => {
  const rows = normalizeStockItems(
    [{
      product_id: 1,
      amount: '0.5',
      best_before_date: '2026-07-20',
      product: { name: 'Картофель', qu_id_stock: 2 },
    }],
    new Map([[2, { id: 2, name: 'кг' }]]),
  );

  assert.deepEqual(rows, [
    {
      product_id: 1,
      name: 'Картофель',
      amount: '0.5',
      unit: 'кг',
      best_before_date: '2026-07-20',
    },
  ]);
});

test('runs stock table command', async () => {
  const output = await runStockCommand({
    format: 'table',
    client: {
      getStock: async () => [{
        product_id: 1,
        amount: 2,
        product: { name: 'Сметана', qu_id_stock: 3 },
      }],
      getQuantityUnits: async () => [{ id: 3, name: 'шт' }],
    },
  });

  assert.match(output, /product_id/);
  assert.match(output, /Сметана/);
  assert.match(output, /шт/);
});
