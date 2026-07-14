'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRecipeIngredientDeletePlan,
  runRecipeIngredientDeleteCommand,
} = require('../src/commands/recipe-ingredient-delete');

const recipes = [
  { id: 7, name: 'Р‘Р»РёРЅС‹' },
];
const products = [
  { id: 10, name: 'РњР°СЃР»Рѕ РїРѕРґСЃРѕР»РЅРµС‡РЅРѕРµ' },
];
const positions = [
  { id: 12, recipe_id: 7, product_id: 10, amount: 2, qu_id: 1 },
];

test('builds recipe ingredient delete plan by recipe and product', () => {
  assert.deepEqual(buildRecipeIngredientDeletePlan({
    recipe: 'Р‘Р»РёРЅС‹',
    product: 'РњР°СЃР»Рѕ РїРѕРґСЃРѕР»РЅРµС‡РЅРѕРµ',
  }, recipes, products, positions), {
    position: {
      id: 12,
      recipeId: 7,
      recipeName: 'Р‘Р»РёРЅС‹',
      productId: 10,
      productName: 'РњР°СЃР»Рѕ РїРѕРґСЃРѕР»РЅРµС‡РЅРѕРµ',
    },
  });
});

test('builds recipe ingredient delete plan by position id', () => {
  assert.deepEqual(buildRecipeIngredientDeletePlan({
    'position-id': '12',
  }, recipes, products, positions), {
    position: {
      id: 12,
      recipeId: 7,
      recipeName: undefined,
      productId: 10,
      productName: undefined,
    },
  });
});

test('runs recipe-ingredient-delete json command', async () => {
  let deletedPositionId;

  const output = await runRecipeIngredientDeleteCommand({
    format: 'json',
    options: {
      recipe: 'Р‘Р»РёРЅС‹',
      product: 'РњР°СЃР»Рѕ РїРѕРґСЃРѕР»РЅРµС‡РЅРѕРµ',
    },
    client: {
      getRecipes: async () => recipes,
      getProducts: async () => products,
      getRecipePositions: async () => positions,
      deleteRecipePosition: async (id) => {
        deletedPositionId = id;
        return null;
      },
    },
  });

  assert.equal(deletedPositionId, 12);
  assert.deepEqual(JSON.parse(output), {
    action: 'deleted',
    entity: 'recipes_pos',
    position: {
      id: 12,
      recipeId: 7,
      recipeName: 'Р‘Р»РёРЅС‹',
      productId: 10,
      productName: 'РњР°СЃР»Рѕ РїРѕРґСЃРѕР»РЅРµС‡РЅРѕРµ',
    },
    result: null,
  });
});
