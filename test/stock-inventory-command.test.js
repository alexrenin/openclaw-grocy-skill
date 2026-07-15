'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildStockInventoryPlan,
  runStockInventoryCommand,
} = require('../src/commands/stock-inventory');

const products = [
  { id: 1, name: 'Молоко', qu_id_stock: 3 },
];
const quantityUnits = [
  { id: 3, name: 'л', name_plural: 'литры' },
  { id: 4, name: 'кг' },
];
const locations = [
  { id: 2, name: 'Холодильник' },
];
const stock = [
  { product_id: 1, amount: '1.5' },
];

test('builds stock inventory payload and delta', () => {
  const plan = buildStockInventoryPlan({
    product: 'Молоко',
    'new-amount': '3',
    unit: 'литры',
    'best-before-date': '2026-07-20',
    price: '2.49',
    location: 'Холодильник',
    note: 'counted',
  }, products, quantityUnits, locations, stock);

  assert.deepEqual(plan, {
    product: {
      id: 1,
      name: 'Молоко',
      qu_id_stock: 3,
    },
    current_amount: 1.5,
    new_amount: 3,
    delta: 1.5,
    payload: {
      new_amount: 3,
      best_before_date: '2026-07-20',
      price: 2.49,
      note: 'counted',
      location_id: 2,
    },
  });
});

test('allows zero inventory amount', () => {
  const plan = buildStockInventoryPlan({
    'product-id': '1',
    'new-amount': '0',
    'unit-id': '3',
  }, products, quantityUnits, locations, stock);

  assert.equal(plan.new_amount, 0);
  assert.equal(plan.delta, -1.5);
});

test('calculates no-op inventory delta', () => {
  const plan = buildStockInventoryPlan({
    product: 'Молоко',
    'new-amount': '1.5',
  }, products, quantityUnits, locations, stock);

  assert.equal(plan.current_amount, 1.5);
  assert.equal(plan.delta, 0);
});


test('rejects inventory amount in non-stock unit', () => {
  assert.throws(
    () => buildStockInventoryPlan({
      product: 'Молоко',
      'new-amount': '3',
      unit: 'кг',
    }, products, quantityUnits, locations, stock),
    /--new-amount must be in the product stock unit/,
  );
});

test('runs stock-inventory json command', async () => {
  let inventoriedProductId;
  let inventoriedPayload;
  const output = await runStockInventoryCommand({
    format: 'json',
    options: {
      product: 'Молоко',
      'new-amount': '3',
      unit: 'л',
    },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => quantityUnits,
      getLocations: async () => locations,
      getStock: async () => stock,
      inventoryStockProduct: async (productId, payload) => {
        inventoriedProductId = productId;
        inventoriedPayload = payload;
        return [{ transaction_id: 'tx-inv' }];
      },
    },
  });

  assert.equal(inventoriedProductId, 1);
  assert.deepEqual(inventoriedPayload, { new_amount: 3 });
  assert.equal(JSON.parse(output).transaction_ids[0], 'tx-inv');
});
