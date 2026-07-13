'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeShoppingListItems,
  runShoppingListCommand,
} = require('../src/commands/shopping-list');

test('normalizes shopping list items using product purchase units', () => {
  const rows = normalizeShoppingListItems(
    [{ id: 10, product_id: 1, amount: 2, note: 'акция', done: 0 }],
    new Map([[1, { id: 1, name: 'Молоко', qu_id_purchase: 3, qu_id_stock: 4 }]]),
    new Map([
      [3, { id: 3, name: 'бутылка' }],
      [4, { id: 4, name: 'л' }],
    ]),
  );

  assert.deepEqual(rows, [
    {
      id: 10,
      product_id: 1,
      product_name: 'Молоко',
      amount: 2,
      unit_name: 'бутылка',
      note: 'акция',
      done: 0,
    },
  ]);
});

test('falls back to stock unit when purchase unit is missing', () => {
  const rows = normalizeShoppingListItems(
    [{ id: 11, product_id: 2, amount: 0.5, done: 0 }],
    new Map([[2, { id: 2, name: 'Картофель', qu_id_stock: 5 }]]),
    new Map([[5, { id: 5, name: 'кг' }]]),
  );

  assert.equal(rows[0].unit_name, 'кг');
});

test('runs shopping-list text command and ignores completed items', async () => {
  const output = await runShoppingListCommand({
    format: 'text',
    client: {
      getProducts: async () => [{ id: 1, name: 'Яйца', qu_id_purchase: 2 }],
      getQuantityUnits: async () => [{ id: 2, name: 'шт' }],
      getShoppingList: async () => [
        { id: 1, product_id: 1, amount: 10, done: 0 },
        { id: 2, product_id: 1, amount: 6, done: 1 },
      ],
    },
  });

  assert.equal(output, [
    'Список покупок:',
    '',
    '• Яйца — 10 шт',
  ].join('\n'));
});
