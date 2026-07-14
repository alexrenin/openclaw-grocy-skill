'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildStockAddPlan, parseDate, runStockAddCommand } = require('../src/commands/stock-add');

const products = [
  { id: 1, name: 'Молоко', qu_id_stock: 3 },
  { id: 2, name: 'Картофель', qu_id_stock: 2 },
];
const quantityUnits = [
  { id: 1, name: 'шт' },
  { id: 2, name: 'кг' },
  { id: 3, name: 'л', name_plural: 'литры' },
];

test('builds stock add payload with purchase price', () => {
  const plan = buildStockAddPlan({
    product: 'Молоко',
    amount: '1',
    unit: 'литры',
    price: '2.49',
    'best-before-date': '2026-07-20',
  }, products, quantityUnits);

  assert.deepEqual(plan, {
    product: {
      id: 1,
      name: 'Молоко',
      qu_id_stock: 3,
    },
    payload: {
      amount: 1,
      transaction_type: 'purchase',
      price: 2.49,
      best_before_date: '2026-07-20',
    },
  });
});

test('allows product id and unit id selectors', () => {
  const plan = buildStockAddPlan({
    'product-id': '2',
    amount: '0.5',
    'unit-id': '2',
    price: '1.25',
  }, products, quantityUnits);

  assert.deepEqual(plan.payload, {
    amount: 0.5,
    transaction_type: 'purchase',
    price: 1.25,
  });
});

test('rejects non-stock unit amount', () => {
  assert.throws(
    () => buildStockAddPlan({
      product: 'Молоко',
      amount: '1',
      unit: 'кг',
    }, products, quantityUnits),
    /amount must be in the product stock unit/,
  );
});

test('rejects unknown product without writing', () => {
  assert.throws(
    () => buildStockAddPlan({
      product: 'Сыр',
      amount: '1',
    }, products, quantityUnits),
    /Unknown product: Сыр/,
  );
});

test('validates stock add date', () => {
  assert.equal(parseDate('2026-07-20', '--best-before-date'), '2026-07-20');
  assert.throws(
    () => parseDate('2026-02-31', '--best-before-date'),
    /valid calendar date/,
  );
});

test('runs stock-add json command', async () => {
  let addedProductId;
  let addedPayload;
  const output = await runStockAddCommand({
    format: 'json',
    options: {
      product: 'Молоко',
      amount: '1',
      unit: 'л',
      price: '2.49',
    },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => quantityUnits,
      addStockProduct: async (productId, payload) => {
        addedProductId = productId;
        addedPayload = payload;
        return { ok: true };
      },
    },
  });

  assert.equal(addedProductId, 1);
  assert.deepEqual(addedPayload, {
    amount: 1,
    transaction_type: 'purchase',
    price: 2.49,
  });
  assert.equal(output, JSON.stringify({
    action: 'added',
    entity: 'stock',
    product: {
      id: 1,
      name: 'Молоко',
      qu_id_stock: 3,
    },
    payload: addedPayload,
    result: { ok: true },
  }, null, 2));
});
