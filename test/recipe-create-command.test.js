'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRecipeCreatePlan,
  buildRecipePositionPayload,
  findProductByName,
  parseIngredientsOption,
  runRecipeCreateCommand,
} = require('../src/commands/recipe-create');

const products = [
  { id: 10, name: 'Картофель', qu_id_stock: 1 },
];
const units = [
  { id: 1, name: 'шт', name_plural: 'шт' },
  { id: 2, name: 'кг', name_plural: 'кг' },
];

test('parses ingredients JSON option', () => {
  assert.deepEqual(parseIngredientsOption('[{"name":"Картофель","amount":3,"unit":"шт"}]'), [
    {
      name: 'Картофель',
      amount: 3,
      unit: 'шт',
    },
  ]);
});

test('rejects invalid ingredients JSON', () => {
  assert.throws(
    () => parseIngredientsOption('not json'),
    /--ingredients must be a JSON array/,
  );
});

test('finds product by exact normalized name', () => {
  assert.equal(findProductByName('картофель', products).id, 10);
});

test('builds recipe plan with existing and missing products', () => {
  const plan = buildRecipeCreatePlan({
    name: 'Оливье',
    description: 'Домашний рецепт',
    'base-servings': '4',
    ingredients: JSON.stringify([
      { name: 'Картофель', amount: 3, unit: 'шт' },
      { name: 'Огурцы маринованные', amount: 2, unit: 'шт', note: 'нарезать' },
    ]),
  }, products, units);

  assert.deepEqual(plan.recipePayload, {
    name: 'Оливье',
    description: 'Домашний рецепт',
    type: 'normal',
    base_servings: 4,
  });
  assert.equal(plan.ingredients[0].productId, 10);
  assert.equal(plan.ingredients[0].productPlan, undefined);
  assert.deepEqual(plan.ingredients[1].productPlan.productPayload, {
    name: 'Огурцы маринованные',
    qu_id_stock: 1,
    qu_id_purchase: 1,
    qu_id_consume: 1,
  });
});

test('builds recipe position payload', () => {
  assert.deepEqual(buildRecipePositionPayload(5, {
    productId: 10,
    amount: 3,
    unitId: 1,
    note: 'нарезать',
    ingredientGroup: 'Овощи',
    roundUp: 1,
  }), {
    recipe_id: 5,
    product_id: 10,
    amount: 3,
    qu_id: 1,
    note: 'нарезать',
    ingredient_group: 'Овощи',
    round_up: 1,
  });
});

test('rejects unknown ingredient unit', () => {
  assert.throws(
    () => buildRecipeCreatePlan({
      name: 'Оливье',
      ingredients: JSON.stringify([
        { name: 'Картофель', amount: 3, unit: 'ведро' },
      ]),
    }, products, units),
    /Unknown ingredient unit: ведро/,
  );
});

test('runs recipe-create json command and creates missing products', async () => {
  const calls = [];

  const output = await runRecipeCreateCommand({
    format: 'json',
    options: {
      name: 'Оливье',
      ingredients: JSON.stringify([
        { name: 'Картофель', amount: 3, unit: 'шт' },
        { name: 'Огурцы маринованные', amount: 2, unit: 'шт' },
      ]),
    },
    client: {
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      createProduct: async (payload) => {
        calls.push(['createProduct', payload]);
        return { created_object_id: 20 };
      },
      createQuantityUnitConversion: async (payload) => {
        calls.push(['createQuantityUnitConversion', payload]);
        return { created_object_id: 30 };
      },
      createRecipe: async (payload) => {
        calls.push(['createRecipe', payload]);
        return { created_object_id: 40 };
      },
      createRecipePosition: async (payload) => {
        calls.push(['createRecipePosition', payload]);
        return { created_object_id: 50 + calls.length };
      },
    },
  });

  assert.deepEqual(calls, [
    ['createProduct', {
      name: 'Огурцы маринованные',
      qu_id_stock: 1,
      qu_id_purchase: 1,
      qu_id_consume: 1,
    }],
    ['createRecipe', {
      name: 'Оливье',
      type: 'normal',
    }],
    ['createRecipePosition', {
      recipe_id: 40,
      product_id: 10,
      amount: 3,
      qu_id: 1,
    }],
    ['createRecipePosition', {
      recipe_id: 40,
      product_id: 20,
      amount: 2,
      qu_id: 1,
    }],
  ]);

  assert.deepEqual(JSON.parse(output), {
    action: 'created',
    entity: 'recipes',
    payload: {
      name: 'Оливье',
      type: 'normal',
    },
    result: { created_object_id: 40 },
    createdProducts: [
      {
        name: 'Огурцы маринованные',
        payload: {
          name: 'Огурцы маринованные',
          qu_id_stock: 1,
          qu_id_purchase: 1,
          qu_id_consume: 1,
        },
        result: { created_object_id: 20 },
        conversions: [],
      },
    ],
    positions: [
      {
        payload: {
          recipe_id: 40,
          product_id: 10,
          amount: 3,
          qu_id: 1,
        },
        result: { created_object_id: 53 },
      },
      {
        payload: {
          recipe_id: 40,
          product_id: 20,
          amount: 2,
          qu_id: 1,
        },
        result: { created_object_id: 54 },
      },
    ],
  });
});
