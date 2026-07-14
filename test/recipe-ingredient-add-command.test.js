'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildIngredientInput,
  buildRecipeIngredientAddPlan,
  resolveRecipeOption,
  runRecipeIngredientAddCommand,
} = require('../src/commands/recipe-ingredient-add');

const recipes = [
  { id: 7, name: 'Блины' },
  { id: 8, name: 'Оливье' },
];
const products = [
  { id: 10, name: 'Масло подсолнечное', qu_id_stock: 2 },
];
const units = [
  { id: 1, name: 'шт', name_plural: 'шт' },
  { id: 2, name: 'мл', name_plural: 'мл' },
];
const locations = [
  { id: 1, name: 'Кладовка' },
];

test('builds ingredient input from command options', () => {
  assert.deepEqual(buildIngredientInput({
    product: 'Масло подсолнечное',
    amount: '30',
    unit: 'мл',
    note: 'в тесто',
    'ingredient-group': 'Тесто',
  }), {
    name: 'Масло подсолнечное',
    productId: undefined,
    amount: '30',
    unit: 'мл',
    note: 'в тесто',
    ingredientGroup: 'Тесто',
    variableAmount: undefined,
    onlyCheckSingleUnitInStock: undefined,
    roundUp: undefined,
    product: {
      description: undefined,
      location: undefined,
      locationId: undefined,
      stockUnit: undefined,
      purchaseUnit: undefined,
      purchaseToStockFactor: undefined,
      consumeUnit: undefined,
      consumeToStockFactor: undefined,
    },
  });
});

test('rejects product name and product id together', () => {
  assert.throws(
    () => buildIngredientInput({
      product: 'Масло подсолнечное',
      'product-id': '10',
      amount: '30',
      unit: 'мл',
    }),
    /Specify either --product-id or --product, not both/,
  );
});

test('resolves recipe by name or id', () => {
  assert.deepEqual(resolveRecipeOption({
    nameValue: 'блины',
    recipes,
  }), {
    id: 7,
    name: 'Блины',
  });
  assert.deepEqual(resolveRecipeOption({
    idValue: '8',
    recipes,
  }), {
    id: 8,
    name: 'Оливье',
  });
});

test('rejects unknown recipe with available choices', () => {
  assert.throws(
    () => resolveRecipeOption({
      nameValue: 'Каша',
      recipes,
    }),
    /Unknown recipe: Каша\. Available recipes: 7:Блины, 8:Оливье/,
  );
});

test('builds add ingredient plan for existing recipe and product', () => {
  const plan = buildRecipeIngredientAddPlan({
    recipe: 'Блины',
    product: 'Масло подсолнечное',
    amount: '30',
    unit: 'мл',
    note: 'в тесто',
  }, recipes, products, units, locations);

  assert.deepEqual(plan.recipe, {
    id: 7,
    name: 'Блины',
  });
  assert.equal(plan.ingredient.productId, 10);
  assert.equal(plan.ingredient.productPlan, undefined);
  assert.equal(plan.ingredient.amount, 30);
  assert.equal(plan.ingredient.unitId, 2);
  assert.equal(plan.ingredient.note, 'в тесто');
});

test('rejects missing product without explicit creation confirmation', () => {
  assert.throws(
    () => buildRecipeIngredientAddPlan({
      recipe: 'Блины',
      product: 'Растительное масло',
      amount: '30',
      unit: 'мл',
      location: 'Кладовка',
    }, recipes, products, units, locations),
    /Ask the user to confirm creating this new product, then rerun with --create-missing-products true/,
  );
});

test('plans missing product creation only with explicit confirmation', () => {
  const plan = buildRecipeIngredientAddPlan({
    recipe: 'Блины',
    product: 'Растительное масло',
    amount: '30',
    unit: 'мл',
    location: 'Кладовка',
  }, recipes, products, units, locations, { createMissingProducts: true });

  assert.deepEqual(plan.ingredient.productPlan.productPayload, {
    name: 'Растительное масло',
    location_id: 1,
    qu_id_stock: 2,
    qu_id_purchase: 2,
    qu_id_consume: 2,
  });
});

test('runs recipe-ingredient-add json command', async () => {
  const calls = [];
  const output = await runRecipeIngredientAddCommand({
    format: 'json',
    options: {
      recipe: 'Блины',
      product: 'Масло подсолнечное',
      amount: '30',
      unit: 'мл',
      note: 'в тесто',
    },
    client: {
      getRecipes: async () => recipes,
      getProducts: async () => products,
      getQuantityUnits: async () => units,
      getLocations: async () => locations,
      createProduct: async (payload) => {
        calls.push(['createProduct', payload]);
        return { created_object_id: 20 };
      },
      createQuantityUnitConversion: async (payload) => {
        calls.push(['createQuantityUnitConversion', payload]);
        return { created_object_id: 30 };
      },
      createRecipePosition: async (payload) => {
        calls.push(['createRecipePosition', payload]);
        return { created_object_id: 42 };
      },
    },
  });

  assert.deepEqual(calls, [
    ['createRecipePosition', {
      recipe_id: 7,
      product_id: 10,
      amount: 30,
      qu_id: 2,
      note: 'в тесто',
    }],
  ]);
  assert.deepEqual(JSON.parse(output), {
    action: 'added',
    entity: 'recipes_pos',
    recipe: {
      id: 7,
      name: 'Блины',
    },
    payload: {
      recipe_id: 7,
      product_id: 10,
      amount: 30,
      qu_id: 2,
      note: 'в тесто',
    },
    result: { created_object_id: 42 },
  });
});
