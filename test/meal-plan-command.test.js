'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { runMealPlanCommand } = require('../src/commands/meal-plan');
const { runMealPlanAddCommand } = require('../src/commands/meal-plan-add');
const { runMealPlanDeleteCommand } = require('../src/commands/meal-plan-delete');
const { runMealPlanUpdateCommand, buildMealPlanUpdatePlan } = require('../src/commands/meal-plan-update');
const {
  buildMealPlanRecipePayload,
  filterMealPlanEntries,
  normalizeMealPlanEntries,
  parseDate,
} = require('../src/commands/meal-plan-shared');

const recipes = [
  { id: 1, name: 'Pancakes', type: 'normal' },
  { id: 2, name: 'Soup', type: 'normal' },
];
const sections = [
  { id: 10, name: 'Dinner' },
  { id: 11, name: 'Breakfast' },
];
const mealPlanEntries = [
  { id: 100, day: '2026-07-16', type: 'recipe', recipe_id: 1, section_id: 11, note: 'morning' },
  { id: 101, day: '2026-07-17', type: 'recipe', recipe_id: 2, section_id: 10 },
];

function buildClient(overrides = {}) {
  const calls = [];
  const client = {
    calls,
    createdPayloads: [],
    updatedPayloads: [],
    deletedIds: [],
    getMealPlanEntries: async () => {
      calls.push('getMealPlanEntries');
      return mealPlanEntries;
    },
    getMealPlanEntry: async (id) => {
      calls.push(['getMealPlanEntry', id]);
      return mealPlanEntries.find((entry) => Number(entry.id) === Number(id));
    },
    getMealPlanSections: async () => {
      calls.push('getMealPlanSections');
      return sections;
    },
    getRecipes: async () => {
      calls.push('getRecipes');
      return recipes;
    },
    createMealPlanEntry: async (payload) => {
      calls.push('createMealPlanEntry');
      client.createdPayloads.push(payload);
      return { created_object_id: 102 };
    },
    updateMealPlanEntry: async (id, payload) => {
      calls.push(['updateMealPlanEntry', id]);
      client.updatedPayloads.push({ id, payload });
      return { updated_object_id: id };
    },
    deleteMealPlanEntry: async (id) => {
      calls.push(['deleteMealPlanEntry', id]);
      client.deletedIds.push(id);
      return null;
    },
  };

  return Object.assign(client, overrides);
}

test('validates meal plan dates as real YYYY-MM-DD calendar dates', () => {
  assert.equal(parseDate('2026-07-16'), '2026-07-16');
  assert.throws(() => parseDate('2026-7-16'), /YYYY-MM-DD/);
  assert.throws(() => parseDate('2026-02-30'), /valid calendar date/);
});

test('normalizes and filters meal plan entries by date', () => {
  const normalized = normalizeMealPlanEntries(mealPlanEntries, recipes, sections);

  assert.deepEqual(normalized.map((entry) => [
    entry.id,
    entry.date,
    entry.recipe_name,
    entry.section_name,
  ]), [
    [100, '2026-07-16', 'Pancakes', 'Breakfast'],
    [101, '2026-07-17', 'Soup', 'Dinner'],
  ]);
  assert.deepEqual(filterMealPlanEntries(normalized, {
    from: '2026-07-17',
    to: '2026-07-17',
  }).map((entry) => entry.id), [101]);
});

test('normalizes Grocy no-section sentinel as an empty section', () => {
  const [entry] = normalizeMealPlanEntries([
    { id: 102, day: '2026-07-18', type: 'recipe', recipe_id: 1, section_id: -1 },
  ], recipes, sections);

  assert.equal(entry.section_id, '');
  assert.equal(entry.section_name, '');
});

test('builds a Grocy recipe meal plan payload', () => {
  assert.deepEqual(buildMealPlanRecipePayload({
    date: '2026-07-16',
    recipeId: 1,
    sectionId: 11,
    note: 'morning',
  }), {
    day: '2026-07-16',
    type: 'recipe',
    recipe_id: 1,
    section_id: 11,
    note: 'morning',
  });
});

test('meal-plan is read-only and returns resolved rows', async () => {
  const client = buildClient();
  const output = await runMealPlanCommand({
    client,
    format: 'json',
    options: { from: '2026-07-16', to: '2026-07-16' },
  });
  const rows = JSON.parse(output);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].recipe_name, 'Pancakes');
  assert.deepEqual(client.calls.sort(), [
    'getMealPlanEntries',
    'getMealPlanSections',
    'getRecipes',
  ].sort());
});

test('meal-plan-add resolves recipe and section and creates one meal plan row', async () => {
  const client = buildClient();
  const output = await runMealPlanAddCommand({
    client,
    format: 'json',
    options: {
      date: '2026-07-18',
      recipe: 'Pancakes',
      section: 'Dinner',
      note: 'family',
    },
  });
  const result = JSON.parse(output);

  assert.equal(result.action, 'created');
  assert.deepEqual(client.createdPayloads, [{
    day: '2026-07-18',
    type: 'recipe',
    recipe_id: 1,
    section_id: 10,
    note: 'family',
  }]);
});

test('meal-plan-add rejects unsupported per-row servings before writing', async () => {
  const client = buildClient();

  await assert.rejects(
    () => runMealPlanAddCommand({
      client,
      format: 'json',
      options: {
        date: '2026-07-18',
        recipe: 'Pancakes',
        servings: '3',
      },
    }),
    /do not support per-row servings/,
  );
  assert.deepEqual(client.createdPayloads, []);
});

test('meal-plan-update merges existing row and updates selected fields only', async () => {
  const client = buildClient();
  const output = await runMealPlanUpdateCommand({
    client,
    format: 'json',
    options: {
      'entry-id': '100',
      date: '2026-07-19',
      recipe: 'Soup',
      section: 'Dinner',
      note: 'changed',
    },
  });
  const result = JSON.parse(output);

  assert.deepEqual(result.changed_fields, ['day', 'recipe_id', 'section_id', 'note']);
  assert.deepEqual(client.updatedPayloads, [{
    id: 100,
    payload: {
      day: '2026-07-19',
      type: 'recipe',
      recipe_id: 2,
      note: 'changed',
      section_id: 10,
    },
  }]);
});

test('meal-plan-update rejects unsupported per-row servings before writing', async () => {
  const client = buildClient();

  await assert.rejects(
    () => runMealPlanUpdateCommand({
      client,
      format: 'json',
      options: {
        'entry-id': '100',
        servings: '2',
      },
    }),
    /do not support per-row servings/,
  );
  assert.deepEqual(client.updatedPayloads, []);
});

test('meal-plan-update rejects empty updates', () => {
  assert.throws(
    () => buildMealPlanUpdatePlan({
      entry: mealPlanEntries[0],
      recipes,
      sections,
      options: {},
    }),
    /At least one meal plan field/,
  );
});

test('meal-plan-delete verifies confirm recipe name before deleting', async () => {
  const client = buildClient();
  const output = await runMealPlanDeleteCommand({
    client,
    format: 'json',
    options: {
      'entry-id': '100',
      'confirm-recipe-name': 'Pancakes',
    },
  });
  const result = JSON.parse(output);

  assert.equal(result.action, 'deleted');
  assert.deepEqual(client.deletedIds, [100]);
});

test('meal-plan-delete rejects mismatched confirm recipe name', async () => {
  const client = buildClient();

  await assert.rejects(
    () => runMealPlanDeleteCommand({
      client,
      format: 'json',
      options: {
        'entry-id': '100',
        'confirm-recipe-name': 'Soup',
      },
    }),
    /Confirmation recipe name does not match/,
  );
  assert.deepEqual(client.deletedIds, []);
});
