'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeRecipes, runRecipesCommand } = require('../src/commands/recipes');

const recipes = [
  { id: -1, name: '2026-07-15', type: 'mealplan-day', base_servings: 1, desired_servings: 1 },
  { id: 7, name: 'Блины', description: '<p>Тонкие&nbsp;блины<br style="clear:both" />Подать горячими</p>', type: 'normal', base_servings: 4, desired_servings: 2 },
  { id: 8, name: 'Салат', type: 'normal' },
];
const positions = [
  { id: 12, recipe_id: 7, product_id: 10 },
  { id: 13, recipe_id: '7', product_id: 11 },
];

test('normalizes recipes with ingredient counts', () => {
  assert.deepEqual(normalizeRecipes(recipes, positions), [
    {
      id: 7,
      name: 'Блины',
      description: '<p>Тонкие&nbsp;блины<br style="clear:both" />Подать горячими</p>',
      type: 'normal',
      base_servings: 4,
      desired_servings: 2,
      ingredient_count: 2,
    },
    {
      id: 8,
      name: 'Салат',
      description: '',
      type: 'normal',
      base_servings: '',
      desired_servings: '',
      ingredient_count: 0,
    },
  ]);
});

test('runs recipes json command', async () => {
  const output = await runRecipesCommand({
    format: 'json',
    client: {
      getRecipes: async () => recipes,
      getRecipePositions: async () => positions,
    },
  });

  assert.deepEqual(JSON.parse(output), normalizeRecipes(recipes, positions));
});

test('formats recipes as a table', async () => {
  const output = await runRecipesCommand({
    format: 'table',
    client: {
      getRecipes: async () => recipes,
      getRecipePositions: async () => positions,
    },
  });

  assert.match(output, /base_servings/);
  assert.match(output, /Блины/);
  assert.match(output, /Тонкие блины Подать горячими/);
  assert.doesNotMatch(output, /<p>|mealplan-day|2026-07-15/);
  assert.match(output, /\| 2\s*$/m);
});
