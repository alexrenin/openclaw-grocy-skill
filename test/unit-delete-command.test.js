'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildUnitDeletePlan,
  findUnitDeleteBlockers,
  runUnitDeleteCommand,
} = require('../src/commands/unit-delete');

const unit = {
  id: 7,
  name: 'jar',
  name_plural: 'jars',
};

test('builds unit delete plan when unit is unused', () => {
  const plan = buildUnitDeletePlan({
    unitId: 7,
    unit,
    products: [],
    recipePositions: [],
    shoppingList: [],
    quantityUnitConversions: [],
    confirmUnitName: 'jar',
  });

  assert.deepEqual(plan, {
    unit: {
      id: 7,
      name: 'jar',
      name_plural: 'jars',
    },
    checks: {
      products: 'none',
      recipe_positions: 'none',
      shopping_list: 'none',
      quantity_unit_conversions: 'none',
    },
  });
});

test('rejects unit delete when confirmation name does not match', () => {
  assert.throws(
    () => buildUnitDeletePlan({
      unitId: 7,
      unit,
      products: [],
      recipePositions: [],
      shoppingList: [],
      quantityUnitConversions: [],
      confirmUnitName: 'bottle',
    }),
    /--confirm-unit-name does not match quantity unit 7:jar/,
  );
});

test('finds unit delete blockers', () => {
  assert.deepEqual(findUnitDeleteBlockers({
    unitId: 7,
    products: [
      { id: 1, qu_id_stock: 7 },
      { id: 2, qu_id_purchase: 7 },
      { id: 3, qu_id_consume: 7 },
    ],
    recipePositions: [
      { id: 8, qu_id: 7 },
    ],
    shoppingList: [
      { id: 9, qu_id: 7 },
    ],
    quantityUnitConversions: [
      { id: 10, from_qu_id: 7, to_qu_id: 1 },
      { id: 11, from_qu_id: 1, to_qu_id: 7 },
    ],
  }), [
    'used by products 1, 2, 3',
    'used by recipe ingredient rows 8',
    'used by shopping list rows 9',
    'used by quantity unit conversion rows 10, 11',
  ]);
});

test('rejects unit delete when unit is still in use', () => {
  assert.throws(
    () => buildUnitDeletePlan({
      unitId: 7,
      unit,
      products: [
        { id: 1, qu_id_stock: 7 },
      ],
      recipePositions: [],
      shoppingList: [],
      quantityUnitConversions: [],
    }),
    /Fallback: update dependent products, recipe ingredients, shopping list rows, or conversion rows first/,
  );
});

test('runs unit-delete json command', async () => {
  let deletedUnitId;

  const output = await runUnitDeleteCommand({
    format: 'json',
    options: {
      'unit-id': '7',
      'confirm-unit-name': 'jar',
    },
    client: {
      getObject: async (entity, objectId) => {
        assert.equal(entity, 'quantity_units');
        assert.equal(objectId, 7);
        return unit;
      },
      getProducts: async () => [],
      getRecipePositions: async () => [],
      getShoppingList: async () => [],
      getObjects: async (entity) => {
        assert.equal(entity, 'quantity_unit_conversions');
        return [];
      },
      deleteQuantityUnit: async (unitId) => {
        deletedUnitId = unitId;
        return null;
      },
    },
  });

  assert.equal(deletedUnitId, 7);
  assert.equal(output, JSON.stringify({
    action: 'deleted',
    entity: 'quantity_units',
    unit: {
      id: 7,
      name: 'jar',
      name_plural: 'jars',
    },
    checks: {
      products: 'none',
      recipe_positions: 'none',
      shopping_list: 'none',
      quantity_unit_conversions: 'none',
    },
    result: null,
  }, null, 2));
});
