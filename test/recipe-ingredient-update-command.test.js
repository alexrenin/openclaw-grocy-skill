'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRecipeIngredientUpdatePlan,
  buildRecipePositionUpdatePayload,
  resolveProductOption,
  resolveRecipePositionOption,
  runRecipeIngredientUpdateCommand,
} = require('../src/commands/recipe-ingredient-update');

const recipes = [
  { id: 7, name: 'Блины' },
];
const products = [
  { id: 10, name: 'Масло подсолнечное' },
];
const units = [
  { id: 1, name: 'л', name_plural: 'литры' },
  { id: 2, name: 'мл', name_plural: 'мл' },
];
const positions = [
  { id: 12, recipe_id: 7, product_id: 10, amount: 2, qu_id: 1 },
];

test('builds update payload for amount and unit', () => {
  assert.deepEqual(buildRecipePositionUpdatePayload({
    amount: '0.03',
    unit: 'л',
    note: 'в тесто',
  }, units), {
    amount: 0.03,
    qu_id: 1,
    note: 'в тесто',
  });
});

test('rejects empty recipe ingredient update payload', () => {
  assert.throws(
    () => buildRecipePositionUpdatePayload({}, units),
    /Nothing to update/,
  );
});

test('resolves product by name or id', () => {
  assert.deepEqual(resolveProductOption({
    nameValue: 'масло подсолнечное',
    products,
  }), {
    id: 10,
    name: 'Масло подсолнечное',
  });
  assert.deepEqual(resolveProductOption({
    idValue: '10',
    products,
  }), {
    id: 10,
    name: 'Масло подсолнечное',
  });
});

test('resolves recipe ingredient position by recipe and product', () => {
  assert.deepEqual(resolveRecipePositionOption({
    recipe: 'Блины',
    product: 'Масло подсолнечное',
  }, recipes, products, positions), {
    id: 12,
    recipeId: 7,
    recipeName: 'Блины',
    productId: 10,
    productName: 'Масло подсолнечное',
  });
});

test('rejects ambiguous recipe ingredient positions', () => {
  assert.throws(
    () => resolveRecipePositionOption({
      recipe: 'Блины',
      product: 'Масло подсолнечное',
    }, recipes, products, [
      ...positions,
      { id: 13, recipe_id: 7, product_id: 10, amount: 1, qu_id: 1 },
    ]),
    /Ambiguous recipe ingredient/,
  );
});

test('builds recipe ingredient update plan', () => {
  const plan = buildRecipeIngredientUpdatePlan({
    recipe: 'Блины',
    product: 'Масло подсолнечное',
    amount: '0.03',
    unit: 'л',
  }, recipes, products, units, positions);

  assert.deepEqual(plan, {
    position: {
      id: 12,
      recipeId: 7,
      recipeName: 'Блины',
      productId: 10,
      productName: 'Масло подсолнечное',
    },
    payload: {
      amount: 0.03,
      qu_id: 1,
    },
  });
});

test('runs recipe-ingredient-update json command', async () => {
  let updatedId;
  let updatedPayload;

  const output = await runRecipeIngredientUpdateCommand({
    format: 'json',
    options: {
      recipe: 'Блины',
      product: 'Масло подсолнечное',
      amount: '0.03',
      unit: 'л',
    },
    client: {
      getRecipes: async () => recipes,
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      getRecipePositions: async () => positions,
      updateRecipePosition: async (id, payload) => {
        updatedId = id;
        updatedPayload = payload;
        return { updated: true };
      },
    },
  });

  assert.equal(updatedId, 12);
  assert.deepEqual(updatedPayload, {
    amount: 0.03,
    qu_id: 1,
  });
  assert.deepEqual(JSON.parse(output), {
    action: 'updated',
    entity: 'recipes_pos',
    position: {
      id: 12,
      recipeId: 7,
      recipeName: 'Блины',
      productId: 10,
      productName: 'Масло подсолнечное',
    },
    payload: {
      amount: 0.03,
      qu_id: 1,
    },
    result: { updated: true },
  });
});
