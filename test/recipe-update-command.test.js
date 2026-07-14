'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildCurrentRecipePayload,
  buildRecipeUpdatePlan,
  resolveRecipeObject,
  runRecipeUpdateCommand,
} = require('../src/commands/recipe-update');

const recipes = [
  {
    id: 11,
    name: 'Salad',
    type: 'normal',
    description: 'Old',
    base_servings: 2,
    desired_servings: 2,
  },
];

test('resolves recipe object by name or id', () => {
  assert.deepEqual(resolveRecipeObject({
    nameValue: 'salad',
    recipes,
  }), recipes[0]);

  assert.deepEqual(resolveRecipeObject({
    idValue: '11',
    recipes,
  }), recipes[0]);
});

test('builds recipe update payload while preserving existing fields', () => {
  const plan = buildRecipeUpdatePlan({
    recipe: 'Salad',
    name: 'Potato salad',
    description: '',
    'base-servings': '4',
    'desired-servings': '4',
  }, recipes);

  assert.deepEqual(plan, {
    recipe: {
      id: 11,
      name: 'Salad',
    },
    payload: {
      name: 'Potato salad',
      type: 'normal',
      description: '',
      base_servings: 4,
      desired_servings: 4,
    },
  });
});

test('builds current recipe payload from supported recipe fields only', () => {
  assert.deepEqual(buildCurrentRecipePayload({
    id: 11,
    name: 'Salad',
    type: 'normal',
    userfields_id: 99,
    description: 'Old',
    base_servings: 2,
    desired_servings: 2,
    not_check_shoppinglist: 1,
  }), {
    name: 'Salad',
    type: 'normal',
    description: 'Old',
    base_servings: 2,
    desired_servings: 2,
    not_check_shoppinglist: 1,
  });
});

test('rejects empty recipe update payload', () => {
  assert.throws(
    () => buildRecipeUpdatePlan({ recipe: 'Salad' }, recipes),
    /At least one recipe field/,
  );
});

test('rejects ambiguous recipe selector', () => {
  assert.throws(
    () => resolveRecipeObject({
      nameValue: 'Salad',
      recipes: [
        ...recipes,
        { id: 12, name: 'Salad' },
      ],
    }),
    /Ambiguous recipe/,
  );
});

test('runs recipe-update json command', async () => {
  let updatedRecipeId;
  let updatedPayload;

  const output = await runRecipeUpdateCommand({
    format: 'json',
    options: {
      recipe: 'Salad',
      name: 'Potato salad',
      'base-servings': '4',
    },
    client: {
      getRecipes: async () => recipes,
      updateRecipe: async (id, payload) => {
        updatedRecipeId = id;
        updatedPayload = payload;
        return null;
      },
    },
  });

  assert.equal(updatedRecipeId, 11);
  assert.deepEqual(updatedPayload, {
    name: 'Potato salad',
    type: 'normal',
    description: 'Old',
    base_servings: 4,
    desired_servings: 2,
  });
  assert.deepEqual(JSON.parse(output), {
    action: 'updated',
    entity: 'recipes',
    recipe: {
      id: 11,
      name: 'Salad',
    },
    payload: updatedPayload,
    result: null,
  });
});
