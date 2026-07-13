'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeProducts, runProductsCommand } = require('../src/commands/products');

test('normalizes products with stock and purchase units', () => {
  const rows = normalizeProducts(
    [{ id: 1, name: 'Молоко', description: '2.5%', qu_id_stock: 2, qu_id_purchase: 3 }],
    new Map([
      [2, { id: 2, name: 'л' }],
      [3, { id: 3, name: 'бутылка' }],
    ]),
  );

  assert.deepEqual(rows, [
    {
      id: 1,
      name: 'Молоко',
      description: '2.5%',
      stock_unit: 'л',
      purchase_unit: 'бутылка',
    },
  ]);
});

test('runs products json command', async () => {
  const output = await runProductsCommand({
    format: 'json',
    client: {
      getProducts: async () => [{ id: 1, name: 'Молоко', qu_id_stock: 2 }],
      getQuantityUnits: async () => [{ id: 2, name: 'л' }],
    },
  });

  assert.equal(output, JSON.stringify([
    {
      id: 1,
      name: 'Молоко',
      description: '',
      stock_unit: 'л',
      purchase_unit: '',
    },
  ], null, 2));
});
