'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeRecipeUserfields,
  runRecipeUserfieldsCommand,
} = require('../src/commands/recipe-userfields');

test('normalizes only recipe userfield definitions', () => {
  const rows = normalizeRecipeUserfields([
    { id: 2, entity: 'products', name: 'brand', caption: 'Brand', type: 'text' },
    { id: 1, entity: 'recipes', name: 'source', caption: 'Source', type: 'text', sort_number: 2 },
    { id: 3, entity: 'recipes', name: 'difficulty', caption: 'Difficulty', type: 'number', sort_number: 1 },
  ]);

  assert.deepEqual(rows, [
    {
      id: 3,
      name: 'difficulty',
      caption: 'Difficulty',
      type: 'number',
      show_as_column_in_tables: '',
      sort_number: 1,
    },
    {
      id: 1,
      name: 'source',
      caption: 'Source',
      type: 'text',
      show_as_column_in_tables: '',
      sort_number: 2,
    },
  ]);
});

test('runs recipe-userfields json command', async () => {
  const output = await runRecipeUserfieldsCommand({
    format: 'json',
    client: {
      getUserfields: async () => [
        { id: 1, entity: 'recipes', name: 'source', caption: 'Source', type: 'text' },
      ],
    },
  });

  assert.equal(output, JSON.stringify([
    {
      id: 1,
      name: 'source',
      caption: 'Source',
      type: 'text',
      show_as_column_in_tables: '',
      sort_number: '',
    },
  ], null, 2));
});

test('runs recipe-userfields table command', async () => {
  const output = await runRecipeUserfieldsCommand({
    format: 'table',
    client: {
      getUserfields: async () => [
        { id: 1, entity: 'recipes', name: 'source', caption: 'Source', type: 'text' },
      ],
    },
  });

  assert.match(output, /source/);
  assert.match(output, /caption/);
});
