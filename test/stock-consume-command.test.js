'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildStockConsumePlan,
  parseBoolean,
  runStockConsumeCommand,
} = require('../src/commands/stock-consume');

const products = [
  { id: 1, name: 'Молоко', qu_id_stock: 3 },
];
const quantityUnits = [
  { id: 3, name: 'л' },
];
const locations = [
  { id: 2, name: 'Холодильник' },
];

test('builds stock consume payload', () => {
  const plan = buildStockConsumePlan({
    product: 'Молоко',
    amount: '0.5',
    unit: 'л',
    spoiled: 'false',
    location: 'Холодильник',
    'recipe-id': '7',
    'exact-amount': 'true',
  }, products, quantityUnits, locations);

  assert.deepEqual(plan.payload, {
    amount: 0.5,
    transaction_type: 'consume',
    recipe_id: 7,
    location_id: 2,
    spoiled: false,
    exact_amount: true,
  });
});

test('requires stock-entry consumes to use amount 1', () => {
  assert.throws(
    () => buildStockConsumePlan({
      product: 'Молоко',
      amount: '0.5',
      'stock-entry-id': '11',
    }, products, quantityUnits, locations),
    /--amount must be 1 when --stock-entry-id is used/,
  );
});

test('validates boolean options', () => {
  assert.equal(parseBoolean('true', '--spoiled'), true);
  assert.equal(parseBoolean('false', '--spoiled'), false);
  assert.throws(() => parseBoolean('yes', '--spoiled'), /must be true or false/);
});

test('runs stock-consume json command', async () => {
  let consumedProductId;
  let consumedPayload;
  const output = await runStockConsumeCommand({
    format: 'json',
    options: {
      product: 'Молоко',
      amount: '1',
      unit: 'л',
    },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => quantityUnits,
      getLocations: async () => locations,
      consumeStockProduct: async (productId, payload) => {
        consumedProductId = productId;
        consumedPayload = payload;
        return [{ transaction_id: 'tx-consume' }];
      },
    },
  });

  assert.equal(consumedProductId, 1);
  assert.deepEqual(consumedPayload, { amount: 1, transaction_type: 'consume' });
  assert.equal(JSON.parse(output).transaction_ids[0], 'tx-consume');
});
