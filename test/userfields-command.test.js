'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeUserfields,
  parseEntity,
  runUserfieldsCommand,
} = require('../src/commands/userfields');

test('normalizes userfield definitions for the selected entity', () => {
  const rows = normalizeUserfields([
    { id: 2, entity: 'products', name: 'brand', caption: 'Brand', type: 'text' },
    { id: 1, entity: 'recipes', name: 'source', caption: 'Source', type: 'text', sort_number: 2 },
    { id: 3, entity: 'recipes', name: 'difficulty', caption: 'Difficulty', type: 'number', sort_number: 1 },
  ], 'recipes');

  assert.deepEqual(rows, [
    {
      id: 3,
      entity: 'recipes',
      name: 'difficulty',
      caption: 'Difficulty',
      type: 'number',
      show_as_column_in_tables: '',
      sort_number: 1,
    },
    {
      id: 1,
      entity: 'recipes',
      name: 'source',
      caption: 'Source',
      type: 'text',
      show_as_column_in_tables: '',
      sort_number: 2,
    },
  ]);
});

test('validates entity names', () => {
  assert.equal(parseEntity('recipes'), 'recipes');
  assert.equal(parseEntity('quantity_units'), 'quantity_units');
  assert.throws(() => parseEntity('bad/entity'), /--entity must contain only/);
  assert.throws(() => parseEntity(''), /Missing required option: --entity/);
});

test('runs userfields json command', async () => {
  const output = await runUserfieldsCommand({
    format: 'json',
    options: {
      entity: 'recipes',
    },
    client: {
      getUserfields: async () => [
        { id: 1, entity: 'recipes', name: 'source', caption: 'Source', type: 'text' },
      ],
    },
  });

  assert.equal(output, JSON.stringify([
    {
      id: 1,
      entity: 'recipes',
      name: 'source',
      caption: 'Source',
      type: 'text',
      show_as_column_in_tables: '',
      sort_number: '',
    },
  ], null, 2));
});

test('runs userfields table command', async () => {
  const output = await runUserfieldsCommand({
    format: 'table',
    options: {
      entity: 'products',
    },
    client: {
      getUserfields: async () => [
        { id: 1, entity: 'products', name: 'brand', caption: 'Brand', type: 'text' },
      ],
    },
  });

  assert.match(output, /brand/);
  assert.match(output, /caption/);
});
