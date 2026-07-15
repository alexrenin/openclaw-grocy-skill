'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatRecipeDetailsTable,
  normalizeRecipeDetails,
  runRecipeGetCommand,
} = require('../src/commands/recipe-get');

const recipe = {
  id: 7,
  name: 'Блины',
  description: '<p>Тонкие&nbsp;блины</p><p>Подать горячими.</p>',
  type: 'normal',
  base_servings: 4,
  desired_servings: 2,
};
const positions = [
  {
    id: 12,
    recipe_id: 7,
    product_id: 10,
    amount: 0.03,
    qu_id: 2,
    ingredient_group: 'Тесто',
    note: 'в тесто',
    variable_amount: '0.02;0.04',
    only_check_single_unit_in_stock: 1,
    round_up: '0',
  },
  { id: 99, recipe_id: 8, product_id: 11, amount: 1, qu_id: 1 },
];
const products = [{ id: 10, name: 'Масло подсолнечное' }];
const units = [{ id: 2, name: 'л' }];

test('normalizes one recipe and expands ingredient names and units', () => {
  assert.deepEqual(normalizeRecipeDetails(recipe, positions, products, units), {
    id: 7,
    name: 'Блины',
    description: '<p>Тонкие&nbsp;блины</p><p>Подать горячими.</p>',
    type: 'normal',
    base_servings: 4,
    desired_servings: 2,
    ingredients: [
      {
        position_id: 12,
        product_id: 10,
        product_name: 'Масло подсолнечное',
        amount: 0.03,
        unit: 'л',
        ingredient_group: 'Тесто',
        note: 'в тесто',
        variable_amount: '0.02;0.04',
        only_check_single_unit_in_stock: true,
        round_up: false,
      },
    ],
  });
});

test('runs recipe-get json command by recipe name', async () => {
  const output = await runRecipeGetCommand({
    format: 'json',
    options: { recipe: 'блины' },
    client: {
      getRecipes: async () => [recipe],
      getRecipePositions: async () => positions,
      getProducts: async () => products,
      getQuantityUnits: async () => units,
    },
  });

  assert.equal(JSON.parse(output).ingredients[0].product_name, 'Масло подсолнечное');
});

test('formats recipe metadata and ingredients as a table', () => {
  const output = formatRecipeDetailsTable(normalizeRecipeDetails(recipe, positions, products, units));

  assert.match(output, /^Recipe: 7:Блины/m);
  assert.match(output, /Description: Тонкие блины\nПодать горячими\./);
  assert.doesNotMatch(output, /<p>|&nbsp;/);
  assert.match(output, /Base servings: 4/);
  assert.match(output, /position_id/);
  assert.match(output, /Масло подсолнечное/);
  assert.match(output, /в тесто/);
});

test('shows an explicit message when a recipe has no ingredients', () => {
  const output = formatRecipeDetailsTable(normalizeRecipeDetails(recipe, [], products, units));

  assert.match(output, /No ingredients$/);
});
