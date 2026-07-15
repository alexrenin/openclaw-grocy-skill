'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildStockTransferPlan,
  runStockTransferCommand,
} = require('../src/commands/stock-transfer');

const products = [
  { id: 1, name: 'Молоко', qu_id_stock: 3 },
];
const quantityUnits = [
  { id: 3, name: 'л' },
];
const locations = [
  { id: 1, name: 'Кладовка' },
  { id: 2, name: 'Холодильник' },
];

test('builds stock transfer payload', () => {
  const plan = buildStockTransferPlan({
    product: 'Молоко',
    amount: '1',
    unit: 'л',
    'from-location': 'Кладовка',
    'to-location': 'Холодильник',
  }, products, quantityUnits, locations);

  assert.deepEqual(plan.payload, {
    amount: 1,
    location_id_from: 1,
    location_id_to: 2,
  });
});

test('rejects same source and target locations', () => {
  assert.throws(
    () => buildStockTransferPlan({
      product: 'Молоко',
      amount: '1',
      'from-location-id': '1',
      'to-location-id': '1',
    }, products, quantityUnits, locations),
    /must be different/,
  );
});

test('runs stock-transfer json command', async () => {
  let transferProductId;
  let transferPayload;
  const output = await runStockTransferCommand({
    format: 'json',
    options: {
      product: 'Молоко',
      amount: '1',
      'from-location': 'Кладовка',
      'to-location': 'Холодильник',
    },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => quantityUnits,
      getLocations: async () => locations,
      transferStockProduct: async (productId, payload) => {
        transferProductId = productId;
        transferPayload = payload;
        return [{ transaction_id: 'tx-transfer' }];
      },
    },
  });

  assert.equal(transferProductId, 1);
  assert.deepEqual(transferPayload, {
    amount: 1,
    location_id_from: 1,
    location_id_to: 2,
  });
  assert.equal(JSON.parse(output).transaction_ids[0], 'tx-transfer');
});
