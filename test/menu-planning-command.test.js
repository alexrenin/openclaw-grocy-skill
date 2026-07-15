'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildMenuPlanRecommendations,
  calculateMenuPlan,
  findConversionFactor,
  formatMenuPlanText,
  parseMenuPlanOptions,
  parseMenuSelections,
} = require('../src/commands/menu-planning');
const { runMenuCheckCommand } = require('../src/commands/menu-check');
const { runMenuPlanCommand } = require('../src/commands/menu-plan');
const { runMenuShoppingListCommand } = require('../src/commands/menu-shopping-list');

const recipes = [
  { id: 1, name: 'Pancakes', type: 'normal', base_servings: 2 },
  { id: 2, name: 'Sauce', type: 'normal', base_servings: 1 },
];
const positions = [
  { id: 10, recipe_id: 1, product_id: 100, amount: 0.5, qu_id: 1 },
  { id: 11, recipe_id: 1, product_id: 101, amount: 200, qu_id: 3 },
  { id: 12, recipe_id: 2, product_id: 100, amount: 0.25, qu_id: 1 },
];
const products = [
  { id: 100, name: 'Flour', qu_id_stock: 1 },
  { id: 101, name: 'Milk', qu_id_stock: 2 },
];
const quantityUnits = [
  { id: 1, name: 'kg' },
  { id: 2, name: 'l' },
  { id: 3, name: 'ml' },
];
const quantityUnitConversions = [
  { id: 1, product_id: 0, from_qu_id: 3, to_qu_id: 2, factor: 0.001 },
];
const stock = [
  { product_id: 100, amount: 0.8, product: products[0] },
  { product_id: 101, amount: 0.1, product: products[1] },
];

function buildClient(overrides = {}) {
  const calls = [];
  const client = {
    calls,
    getRecipes: async () => {
      calls.push('getRecipes');
      return recipes;
    },
    getRecipePositions: async () => {
      calls.push('getRecipePositions');
      return positions;
    },
    getProducts: async () => {
      calls.push('getProducts');
      return products;
    },
    getQuantityUnits: async () => {
      calls.push('getQuantityUnits');
      return quantityUnits;
    },
    getQuantityUnitConversions: async () => {
      calls.push('getQuantityUnitConversions');
      return quantityUnitConversions;
    },
    getStock: async () => {
      calls.push('getStock');
      return stock;
    },
  };

  return Object.assign(client, overrides);
}

test('parses one recipe selector and bulk recipe selectors', () => {
  assert.deepEqual(parseMenuSelections({ recipe: 'Pancakes', servings: '4' }), [
    { id: undefined, name: 'Pancakes', servings: 4 },
  ]);
  assert.deepEqual(parseMenuSelections({ recipes: '[{"id":1,"servings":2},"Sauce"]' }), [
    { id: 1, name: undefined, servings: 2 },
    { id: undefined, name: 'Sauce', servings: undefined },
  ]);
  assert.throws(
    () => parseMenuSelections({ recipe: 'Pancakes', recipes: '[]' }),
    /Specify either --recipes/,
  );
});

test('parses menu-plan options', () => {
  assert.deepEqual(parseMenuPlanOptions({ count: '2', servings: '4', 'only-ready': 'true' }), {
    count: 2,
    servings: 4,
    onlyReady: true,
  });
  assert.deepEqual(parseMenuPlanOptions({}), {
    count: 3,
    servings: undefined,
    onlyReady: false,
  });
  assert.throws(() => parseMenuPlanOptions({ 'only-ready': 'maybe' }), /--only-ready must be true or false/);
});

test('scales servings, aggregates same products, converts units, and calculates missing stock', () => {
  const plan = calculateMenuPlan({
    selections: [
      { name: 'Pancakes', servings: 4 },
      { name: 'Sauce' },
    ],
    recipes,
    positions,
    products,
    quantityUnits,
    quantityUnitConversions,
    stock,
  });

  assert.equal(plan.status, 'missing');
  assert.equal(plan.can_cook, false);
  assert.deepEqual(plan.recipes.map((recipe) => [recipe.name, recipe.servings, recipe.scale]), [
    ['Pancakes', 4, 2],
    ['Sauce', 1, 1],
  ]);
  assert.deepEqual(plan.requirements, [
    {
      product_id: 100,
      product_name: 'Flour',
      required_amount: 1.25,
      unit: 'kg',
      available_amount: 0.8,
      missing_amount: 0.45,
    },
    {
      product_id: 101,
      product_name: 'Milk',
      required_amount: 0.4,
      unit: 'l',
      available_amount: 0.1,
      missing_amount: 0.3,
    },
  ]);
});

test('recommends recipes by readiness and aggregates missing items for selected recipes', async () => {
  const recommendations = await buildMenuPlanRecommendations({
    client: buildClient(),
    options: { count: '2' },
  });

  assert.equal(recommendations.selected_count, 2);
  assert.deepEqual(recommendations.selected.map((candidate) => [
    candidate.rank,
    candidate.recipe_name,
    candidate.status,
    candidate.missing_count,
  ]), [
    [1, 'Sauce', 'ready', 0],
    [2, 'Pancakes', 'missing', 1],
  ]);
  assert.deepEqual(recommendations.shopping_list.items, [
    {
      product_id: 101,
      product_name: 'Milk',
      amount: 0.1,
      unit: 'l',
    },
  ]);
});

test('menu-plan can return only recipes that are ready from current stock', async () => {
  const recommendations = await buildMenuPlanRecommendations({
    client: buildClient(),
    options: { count: '3', 'only-ready': 'true' },
  });

  assert.deepEqual(recommendations.selected.map((candidate) => candidate.recipe_name), ['Sauce']);
  assert.equal(recommendations.aggregate_plan.can_cook, true);
});

test('formats menu-plan text output', async () => {
  const recommendations = await buildMenuPlanRecommendations({
    client: buildClient(),
    options: { count: '2' },
  });
  const output = formatMenuPlanText(recommendations);

  assert.match(output, /План меню:/);
  assert.match(output, /1\. Sauce/);
  assert.match(output, /можно приготовить/);
  assert.match(output, /Общий список недостающих продуктов:/);
  assert.match(output, /Milk/);
});

test('supports direct, reverse, and product-specific conversion priority', () => {
  assert.equal(findConversionFactor({
    productId: 1,
    fromUnitId: 3,
    toUnitId: 2,
    quantityUnitConversions,
  }), 0.001);
  assert.equal(findConversionFactor({
    productId: 1,
    fromUnitId: 2,
    toUnitId: 3,
    quantityUnitConversions,
  }), 1000);
  assert.equal(findConversionFactor({
    productId: 101,
    fromUnitId: 3,
    toUnitId: 2,
    quantityUnitConversions: [
      { product_id: 0, from_qu_id: 3, to_qu_id: 2, factor: 0.001 },
      { product_id: 101, from_qu_id: 3, to_qu_id: 2, factor: 0.002 },
    ],
  }), 0.002);
});

test('formats tiny non-zero amounts without rounding them to zero', () => {
  const {
    formatAmount,
  } = require('../src/commands/menu-planning');

  assert.equal(formatAmount(0.000001), '0,000001');
});

test('reports unresolved ingredients when a required conversion is missing', () => {
  const plan = calculateMenuPlan({
    selections: [{ name: 'Pancakes', servings: 4 }],
    recipes,
    positions,
    products,
    quantityUnits,
    quantityUnitConversions: [],
    stock,
  });

  assert.equal(plan.status, 'missing-and-unresolved');
  assert.equal(plan.unresolved.length, 1);
  assert.match(plan.unresolved[0].reason, /missing conversion from ml to l/);
});

test('runs menu-check as a read-only command with Russian text output', async () => {
  const client = buildClient();
  const output = await runMenuCheckCommand({
    client,
    format: 'text',
    options: { recipe: 'Pancakes', servings: '4' },
  });

  assert.match(output, /Меню нельзя полностью приготовить/);
  assert.match(output, /Не хватает продуктов:/);
  assert.match(output, /Milk/);
  assert.deepEqual(client.calls.sort(), [
    'getProducts',
    'getQuantityUnitConversions',
    'getQuantityUnits',
    'getRecipePositions',
    'getRecipes',
    'getStock',
  ].sort());
});

test('runs menu-shopping-list json command and returns only missing items', async () => {
  const output = await runMenuShoppingListCommand({
    client: buildClient(),
    format: 'json',
    options: { recipes: '[{"name":"Pancakes","servings":4}]' },
  });
  const result = JSON.parse(output);

  assert.deepEqual(result.items, [
    {
      product_id: 100,
      product_name: 'Flour',
      amount: 0.2,
      unit: 'kg',
    },
    {
      product_id: 101,
      product_name: 'Milk',
      amount: 0.3,
      unit: 'l',
    },
  ]);
  assert.equal(result.unresolved.length, 0);
});

test('runs menu-plan json command using read-only Grocy methods', async () => {
  const client = buildClient();
  const output = await runMenuPlanCommand({
    client,
    format: 'json',
    options: { count: '1' },
  });
  const result = JSON.parse(output);

  assert.equal(result.selected_count, 1);
  assert.equal(result.selected[0].recipe_name, 'Sauce');
  assert.deepEqual(client.calls.sort(), [
    'getProducts',
    'getQuantityUnitConversions',
    'getQuantityUnits',
    'getRecipePositions',
    'getRecipes',
    'getStock',
  ].sort());
});

test('rejects explicit servings when a recipe cannot be scaled', () => {
  assert.throws(
    () => calculateMenuPlan({
      selections: [{ name: 'No base', servings: 2 }],
      recipes: [{ id: 3, name: 'No base', type: 'normal' }],
      positions: [],
      products,
      quantityUnits,
      quantityUnitConversions,
      stock,
    }),
    /has no positive base_servings/,
  );
});
