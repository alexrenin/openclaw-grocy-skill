'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildQuantityUnitPayload,
  runUnitCreateCommand,
} = require('../src/commands/unit-create');

test('builds quantity unit payload', () => {
  assert.deepEqual(buildQuantityUnitPayload({
    name: 'банка',
    'name-plural': 'банки',
    description: 'Стеклянная банка',
  }), {
    name: 'банка',
    name_plural: 'банки',
    description: 'Стеклянная банка',
  });
});

test('defaults quantity unit plural name to name', () => {
  assert.deepEqual(buildQuantityUnitPayload({ name: 'пачка' }), {
    name: 'пачка',
    name_plural: 'пачка',
  });
});

test('rejects missing quantity unit name', () => {
  assert.throws(
    () => buildQuantityUnitPayload({}),
    /Missing required option: --name/,
  );
});

test('runs unit-create json command', async () => {
  let createdPayload;

  const output = await runUnitCreateCommand({
    format: 'json',
    options: {
      name: 'банка',
      'name-plural': 'банки',
    },
    client: {
      createQuantityUnit: async (payload) => {
        createdPayload = payload;
        return { created_object_id: 7 };
      },
    },
  });

  assert.deepEqual(createdPayload, {
    name: 'банка',
    name_plural: 'банки',
  });
  assert.equal(output, JSON.stringify({
    action: 'created',
    entity: 'quantity_units',
    payload: createdPayload,
    result: { created_object_id: 7 },
  }, null, 2));
});
