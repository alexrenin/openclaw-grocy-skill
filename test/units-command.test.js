'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeUnits, runUnitsCommand } = require('../src/commands/units');

test('normalizes quantity units', () => {
  assert.deepEqual(normalizeUnits([
    { id: 1, name: 'кг', name_plural: 'кг', description: 'Вес' },
  ]), [
    {
      id: 1,
      name: 'кг',
      name_plural: 'кг',
      description: 'Вес',
    },
  ]);
});

test('runs units table command', async () => {
  const output = await runUnitsCommand({
    format: 'table',
    client: {
      getQuantityUnits: async () => [
        { id: 1, name: 'кг', name_plural: 'кг' },
      ],
    },
  });

  assert.match(output, /id/);
  assert.match(output, /кг/);
});
