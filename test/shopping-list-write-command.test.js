'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildShoppingListAddPlan,
  runShoppingListAddCommand,
} = require('../src/commands/shopping-list-add');
const { runShoppingListCleanCommand } = require('../src/commands/shopping-list-clean');
const { runShoppingListDeleteCommand } = require('../src/commands/shopping-list-delete');
const { runShoppingListDoneCommand } = require('../src/commands/shopping-list-done');
const {
  buildShoppingListUpdatePlan,
  runShoppingListUpdateCommand,
} = require('../src/commands/shopping-list-update');
const { findConversionFactor } = require('../src/commands/shopping-list-write');

const products = [
  { id: 1, name: 'Pickles', qu_id_stock: 1, qu_id_purchase: 2 },
  { id: 2, name: 'Milk', qu_id_stock: 3, qu_id_purchase: 3 },
];
const units = [
  { id: 1, name: 'piece', name_plural: 'pieces' },
  { id: 2, name: 'jar', name_plural: 'jars' },
  { id: 3, name: 'liter', name_plural: 'liters' },
];
const conversions = [
  { id: 1, product_id: 1, from_qu_id: 2, to_qu_id: 1, factor: 10 },
];

test('finds direct and reverse product quantity unit conversions', () => {
  assert.equal(findConversionFactor({
    fromUnitId: 2,
    toUnitId: 1,
    productId: 1,
    quantityUnitConversions: conversions,
  }), 10);
  assert.equal(findConversionFactor({
    fromUnitId: 1,
    toUnitId: 2,
    productId: 1,
    quantityUnitConversions: conversions,
  }), 0.1);
});

test('builds shopping-list-add payload in stock units', () => {
  const plan = buildShoppingListAddPlan({
    options: { product: 'Pickles', amount: '2', unit: 'jar', note: 'sale' },
    products,
    quantityUnits: units,
    quantityUnitConversions: conversions,
    shoppingList: [],
  });

  assert.equal(plan.existingItem, null);
  assert.deepEqual(plan.payload, {
    product_id: 1,
    shopping_list_id: 1,
    amount: 20,
    qu_id: 2,
    note: 'sale',
    done: 0,
  });
});

test('shopping-list-add updates an existing product row instead of duplicating it', () => {
  const existingItem = {
    id: 12,
    shopping_list_id: 1,
    product_id: 1,
    amount: 10,
    qu_id: 2,
    note: 'old note',
    done: 1,
  };
  const plan = buildShoppingListAddPlan({
    options: { product: 'Pickles', amount: '0.5', unit: 'jar' },
    products,
    quantityUnits: units,
    quantityUnitConversions: conversions,
    shoppingList: [existingItem],
  });

  assert.equal(plan.existingItem, existingItem);
  assert.deepEqual(plan.payload, {
    product_id: 1,
    shopping_list_id: 1,
    amount: 15,
    qu_id: 2,
    note: 'old note',
    done: 0,
  });
});

test('shopping-list-add supports note-only rows', () => {
  const plan = buildShoppingListAddPlan({
    options: { note: 'Buy birthday candles', amount: '2' },
    products,
    quantityUnits: units,
    quantityUnitConversions: conversions,
    shoppingList: [],
  });

  assert.deepEqual(plan.payload, {
    shopping_list_id: 1,
    product_id: null,
    amount: 2,
    note: 'Buy birthday candles',
    done: 0,
  });
});

test('shopping-list-add rejects an unconfigured unit conversion', () => {
  assert.throws(
    () => buildShoppingListAddPlan({
      options: { product: 'Milk', amount: '1', unit: 'jar' },
      products,
      quantityUnits: units,
      quantityUnitConversions: conversions,
      shoppingList: [],
    }),
    /No quantity unit conversion is configured/,
  );
});

test('runs shopping-list-add and returns the created object id', async () => {
  let payload;
  const output = await runShoppingListAddCommand({
    format: 'json',
    options: { product: 'Milk', amount: '1' },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      getQuantityUnitConversions: async () => conversions,
      getShoppingList: async () => [],
      createShoppingListItem: async (value) => {
        payload = value;
        return { created_object_id: 21 };
      },
      updateShoppingListItem: async () => {
        throw new Error('update should not be called');
      },
    },
  });

  assert.equal(payload.amount, 1);
  assert.equal(payload.qu_id, 3);
  assert.equal(JSON.parse(output).result.created_object_id, 21);
});

test('builds a shopping-list-update amount and note correction', () => {
  const plan = buildShoppingListUpdatePlan({
    options: { 'item-id': '12', amount: '3', unit: 'jar', note: '' },
    item: {
      id: 12,
      shopping_list_id: 1,
      product_id: 1,
      amount: 20,
      qu_id: 2,
      note: 'sale',
      done: 0,
    },
    products,
    quantityUnits: units,
    quantityUnitConversions: conversions,
  });

  assert.deepEqual(plan.payload, { note: '', qu_id: 2, amount: 30 });
});

test('shopping-list-update requires amount when changing product', () => {
  assert.throws(
    () => buildShoppingListUpdatePlan({
      options: { product: 'Milk' },
      item: { id: 12, product_id: 1, amount: 10, qu_id: 2 },
      products,
      quantityUnits: units,
      quantityUnitConversions: conversions,
    }),
    /--amount is required when changing/,
  );
});

test('runs shopping-list-update by exact item id', async () => {
  let update;
  const item = { id: 12, shopping_list_id: 1, product_id: 2, amount: 1, qu_id: 3, done: 0 };
  const output = await runShoppingListUpdateCommand({
    format: 'json',
    options: { 'item-id': '12', note: 'organic' },
    client: {
      getShoppingListItem: async (id) => {
        assert.equal(id, 12);
        return item;
      },
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      getQuantityUnitConversions: async () => conversions,
      updateShoppingListItem: async (id, payload) => {
        update = { id, payload };
        return null;
      },
    },
  });

  assert.deepEqual(update, { id: 12, payload: { note: 'organic' } });
  assert.equal(JSON.parse(output).action, 'updated');
});

test('runs shopping-list-delete by exact item id', async () => {
  let deletedId;
  const output = await runShoppingListDeleteCommand({
    format: 'json',
    options: { 'item-id': '12' },
    client: {
      getShoppingListItem: async () => ({ id: 12, product_id: 2, amount: 1, qu_id: 3 }),
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      deleteShoppingListItem: async (id) => {
        deletedId = id;
        return null;
      },
    },
  });

  assert.equal(deletedId, 12);
  assert.equal(JSON.parse(output).item.product_name, 'Milk');
});

test('shopping-list-done can mark an item done and undo it', async () => {
  const updates = [];
  const client = {
    getShoppingListItem: async () => ({ id: 12, product_id: 2, amount: 1, qu_id: 3, done: 0 }),
    getProducts: async () => products,
    getQuantityUnits: async () => units,
    updateShoppingListItem: async (id, payload) => {
      updates.push({ id, payload });
      return null;
    },
  };

  const doneOutput = await runShoppingListDoneCommand({
    client,
    format: 'json',
    options: { 'item-id': '12' },
  });
  const undoneOutput = await runShoppingListDoneCommand({
    client,
    format: 'json',
    options: { 'item-id': '12', done: 'false' },
  });

  assert.deepEqual(updates, [
    { id: 12, payload: { done: 1 } },
    { id: 12, payload: { done: 0 } },
  ]);
  assert.equal(JSON.parse(doneOutput).action, 'marked_done');
  assert.equal(JSON.parse(undoneOutput).action, 'marked_undone');
});

test('shopping-list-clean deletes only completed items of the selected list', async () => {
  let clearPayload;
  const output = await runShoppingListCleanCommand({
    format: 'json',
    options: { 'list-id': '2' },
    client: {
      getShoppingList: async () => [
        { id: 1, shopping_list_id: 2, product_id: 1, amount: 10, qu_id: 2, done: 1 },
        { id: 2, shopping_list_id: 2, product_id: 2, amount: 1, qu_id: 3, done: 0 },
        { id: 3, shopping_list_id: 1, product_id: 2, amount: 1, qu_id: 3, done: 1 },
      ],
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      clearShoppingList: async (payload) => {
        clearPayload = payload;
        return null;
      },
    },
  });
  const parsed = JSON.parse(output);

  assert.deepEqual(clearPayload, { list_id: 2, done_only: true });
  assert.equal(parsed.deleted_count, 1);
  assert.equal(parsed.deleted_items[0].id, 1);
});

test('shopping-list-clean dry-run previews completed items without writing', async () => {
  const output = await runShoppingListCleanCommand({
    format: 'json',
    options: { 'list-id': '1', 'dry-run': 'true' },
    client: {
      getShoppingList: async () => [
        { id: 4, shopping_list_id: 1, product_id: 2, amount: 1, qu_id: 3, done: 1 },
      ],
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      clearShoppingList: async () => {
        throw new Error('clear should not be called during dry-run');
      },
    },
  });
  const parsed = JSON.parse(output);

  assert.equal(parsed.action, 'preview_done_items');
  assert.equal(parsed.dry_run, true);
  assert.equal(parsed.deleted_count, 1);
});
