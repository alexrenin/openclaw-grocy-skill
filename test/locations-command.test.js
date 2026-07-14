'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeLocations,
  runLocationsCommand,
} = require('../src/commands/locations');

test('normalizes locations', () => {
  assert.deepEqual(normalizeLocations([
    { id: 1, name: 'Кладовка', description: 'Полка' },
    { id: 2, name: 'Холодильник' },
  ]), [
    { id: 1, name: 'Кладовка', description: 'Полка' },
    { id: 2, name: 'Холодильник', description: '' },
  ]);
});

test('runs locations table command', async () => {
  const output = await runLocationsCommand({
    format: 'table',
    client: {
      getLocations: async () => [
        { id: 1, name: 'Кладовка', description: 'Полка' },
      ],
    },
  });

  assert.match(output, /Кладовка/);
});

test('runs locations json command', async () => {
  const output = await runLocationsCommand({
    format: 'json',
    client: {
      getLocations: async () => [
        { id: 1, name: 'Кладовка' },
      ],
    },
  });

  assert.equal(output, JSON.stringify([
    { id: 1, name: 'Кладовка', description: '' },
  ], null, 2));
});
