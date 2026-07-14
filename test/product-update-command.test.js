'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildProductUpdatePlan,
  parseBooleanInt,
  runProductUpdateCommand,
} = require('../src/commands/product-update');

const products = [
  {
    id: 42,
    name: 'Milk',
    description: 'old',
    location_id: 1,
    qu_id_stock: 3,
    qu_id_purchase: 3,
    qu_id_consume: 3,
    active: 1,
  },
];
const units = [
  { id: 1, name: 'шт' },
  { id: 2, name: 'банка', name_plural: 'банки' },
  { id: 3, name: 'л', name_plural: 'литры' },
];
const locations = [
  { id: 1, name: 'Pantry' },
  { id: 2, name: 'Fridge' },
];

test('builds product update payload by merging current product fields', () => {
  const plan = buildProductUpdatePlan({
    options: {
      product: 'Milk',
      name: 'Milk 2.5%',
      description: '',
      location: 'Fridge',
      active: 'false',
    },
    products,
    quantityUnits: units,
    locations,
    quantityUnitConversions: [],
  });

  assert.deepEqual(plan.product, {
    id: 42,
    name: 'Milk',
  });
  assert.deepEqual(plan.productPayload, {
    id: 42,
    name: 'Milk 2.5%',
    description: '',
    location_id: 2,
    qu_id_stock: 3,
    qu_id_purchase: 3,
    qu_id_consume: 3,
    active: 0,
  });
  assert.deepEqual(plan.conversionOperations, []);
});

test('plans product-specific conversion creation when purchase unit changes', () => {
  const plan = buildProductUpdatePlan({
    options: {
      'product-id': '42',
      'purchase-unit': 'банка',
      'purchase-to-stock-factor': '1.5',
    },
    products,
    quantityUnits: units,
    locations,
    quantityUnitConversions: [],
  });

  assert.equal(plan.productPayload.qu_id_purchase, 2);
  assert.deepEqual(plan.conversionOperations, [
    {
      action: 'create',
      payload: {
        from_qu_id: 2,
        to_qu_id: 3,
        factor: 1.5,
        product_id: 42,
      },
    },
  ]);
});

test('plans product-specific conversion update when conversion already exists', () => {
  const plan = buildProductUpdatePlan({
    options: {
      'product-id': '42',
      'purchase-unit': 'банка',
      'purchase-to-stock-factor': '2',
    },
    products,
    quantityUnits: units,
    locations,
    quantityUnitConversions: [
      {
        id: 7,
        product_id: 42,
        from_qu_id: 2,
        to_qu_id: 3,
        factor: 1.5,
      },
    ],
  });

  assert.deepEqual(plan.conversionOperations, [
    {
      action: 'update',
      id: 7,
      payload: {
        from_qu_id: 2,
        to_qu_id: 3,
        factor: 2,
        product_id: 42,
      },
    },
  ]);
});

test('requires conversion factor when changed unit differs and no conversion exists', () => {
  assert.throws(
    () => buildProductUpdatePlan({
      options: {
        'product-id': '42',
        'purchase-unit': 'банка',
      },
      products,
      quantityUnits: units,
      locations,
      quantityUnitConversions: [],
    }),
    /--purchase-to-stock-factor is required when purchase unit differs from stock unit/,
  );
});

test('rejects update without changes', () => {
  assert.throws(
    () => buildProductUpdatePlan({
      options: {
        'product-id': '42',
      },
      products,
      quantityUnits: units,
      locations,
      quantityUnitConversions: [],
    }),
    /At least one product field or conversion factor must be provided/,
  );
});

test('parses active flag', () => {
  assert.equal(parseBooleanInt('true', '--active'), 1);
  assert.equal(parseBooleanInt('0', '--active'), 0);
  assert.throws(
    () => parseBooleanInt('maybe', '--active'),
    /--active must be true or false/,
  );
});

test('runs product-update json command', async () => {
  const conversionUpdates = [];
  let updatedProductId;
  let updatedProductPayload;

  const output = await runProductUpdateCommand({
    format: 'json',
    options: {
      'product-id': '42',
      name: 'Milk 2.5%',
      'purchase-unit': 'банка',
      'purchase-to-stock-factor': '2',
    },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      getLocations: async () => locations,
      getObjects: async () => [
        {
          id: 7,
          product_id: 42,
          from_qu_id: 2,
          to_qu_id: 3,
          factor: 1.5,
        },
      ],
      updateQuantityUnitConversion: async (id, payload) => {
        conversionUpdates.push({ id, payload });
        return null;
      },
      createQuantityUnitConversion: async () => {
        throw new Error('create should not be called');
      },
      updateProduct: async (productId, payload) => {
        updatedProductId = productId;
        updatedProductPayload = payload;
        return null;
      },
    },
  });

  assert.equal(updatedProductId, 42);
  assert.equal(updatedProductPayload.name, 'Milk 2.5%');
  assert.equal(updatedProductPayload.qu_id_purchase, 2);
  assert.deepEqual(conversionUpdates, [
    {
      id: 7,
      payload: {
        from_qu_id: 2,
        to_qu_id: 3,
        factor: 2,
        product_id: 42,
      },
    },
  ]);
  assert.equal(output, JSON.stringify({
    action: 'updated',
    entity: 'products',
    product: {
      id: 42,
      name: 'Milk',
    },
    payload: updatedProductPayload,
    conversions: [
      {
        action: 'update',
        id: 7,
        payload: {
          from_qu_id: 2,
          to_qu_id: 3,
          factor: 2,
          product_id: 42,
        },
        result: null,
      },
    ],
    result: null,
  }, null, 2));
});
