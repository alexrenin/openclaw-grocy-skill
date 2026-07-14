'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRecipeDeletePlan,
  parseBooleanOption,
  runRecipeDeleteCommand,
} = require('../src/commands/recipe-delete');

const recipes = [
  { id: 11, name: 'Potato salad', type: 'normal' },
];
const positions = [
  { id: 15, recipe_id: 11, product_id: 42 },
  { id: 16, recipe_id: 11, product_id: 43 },
];

test('builds recipe delete plan when recipe has no ingredients', () => {
  assert.deepEqual(buildRecipeDeletePlan({
    options: {
      'recipe-id': '11',
      'confirm-recipe-name': 'Potato salad',
    },
    recipes,
    positions: [],
  }), {
    recipe: {
      id: 11,
      name: 'Potato salad',
    },
    positionsToDelete: [],
    checks: {
      recipe_positions: 'none',
    },
  });
});

test('rejects recipe delete when confirmation name does not match', () => {
  assert.throws(
    () => buildRecipeDeletePlan({
      options: {
        'recipe-id': '11',
        'confirm-recipe-name': 'Soup',
      },
      recipes,
      positions: [],
    }),
    /--confirm-recipe-name does not match recipe 11:Potato salad/,
  );
});

test('rejects recipe delete with ingredient rows unless explicitly requested', () => {
  assert.throws(
    () => buildRecipeDeletePlan({
      options: {
        recipe: 'Potato salad',
      },
      recipes,
      positions,
    }),
    /--delete-ingredients true/,
  );
});

test('builds recipe delete plan with ingredient cleanup', () => {
  assert.deepEqual(buildRecipeDeletePlan({
    options: {
      recipe: 'Potato salad',
      'delete-ingredients': 'true',
    },
    recipes,
    positions,
  }), {
    recipe: {
      id: 11,
      name: 'Potato salad',
    },
    positionsToDelete: [
      { id: 15, recipeId: 11, productId: 42 },
      { id: 16, recipeId: 11, productId: 43 },
    ],
    checks: {
      recipe_positions: 'delete 2',
    },
  });
});

test('parses recipe delete boolean option', () => {
  assert.equal(parseBooleanOption('true', '--delete-ingredients'), true);
  assert.equal(parseBooleanOption('false', '--delete-ingredients'), false);
  assert.throws(
    () => parseBooleanOption('maybe', '--delete-ingredients'),
    /must be true or false/,
  );
});

test('runs recipe-delete json command after deleting ingredient rows', async () => {
  const deletedPositions = [];
  let deletedRecipeId;

  const output = await runRecipeDeleteCommand({
    format: 'json',
    options: {
      'recipe-id': '11',
      'confirm-recipe-name': 'Potato salad',
      'delete-ingredients': 'true',
    },
    client: {
      getRecipes: async () => recipes,
      getRecipePositions: async () => positions,
      deleteRecipePosition: async (id) => {
        deletedPositions.push(id);
        return null;
      },
      deleteRecipe: async (id) => {
        deletedRecipeId = id;
        return null;
      },
    },
  });

  assert.deepEqual(deletedPositions, [15, 16]);
  assert.equal(deletedRecipeId, 11);
  assert.deepEqual(JSON.parse(output), {
    action: 'deleted',
    entity: 'recipes',
    recipe: {
      id: 11,
      name: 'Potato salad',
    },
    deletedPositions: [
      {
        position: { id: 15, recipeId: 11, productId: 42 },
        result: null,
      },
      {
        position: { id: 16, recipeId: 11, productId: 43 },
        result: null,
      },
    ],
    checks: {
      recipe_positions: 'delete 2',
    },
    result: null,
  });
});
