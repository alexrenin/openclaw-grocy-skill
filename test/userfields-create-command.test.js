'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildUserfieldPayload,
  parseUserfieldName,
  parseUserfieldType,
  runUserfieldsCreateCommand,
  slugifyCaption,
} = require('../src/commands/userfields-create');

test('slugifies Russian captions into technical names', () => {
  assert.equal(slugifyCaption('Время готовки'), 'vremya_gotovki');
});

test('builds userfield payload', () => {
  assert.deepEqual(buildUserfieldPayload({
    entity: 'recipes',
    caption: 'Время готовки',
    type: 'text',
    'show-as-column': 'true',
    'input-required': '0',
    'sort-number': '10',
    'default-value': '30 минут',
  }), {
    entity: 'recipes',
    name: 'vremya_gotovki',
    caption: 'Время готовки',
    type: 'text-single-line',
    show_as_column_in_tables: 1,
    input_required: 0,
    sort_number: 10,
    default_value: '30 минут',
  });
});

test('allows explicit userfield names', () => {
  assert.deepEqual(buildUserfieldPayload({
    entity: 'recipes',
    name: 'cook_time_minutes',
    caption: 'Время готовки',
    type: 'number-integral',
  }), {
    entity: 'recipes',
    name: 'cook_time_minutes',
    caption: 'Время готовки',
    type: 'number-integral',
  });
});

test('validates userfield names and types', () => {
  assert.equal(parseUserfieldName('cook_time'), 'cook_time');
  assert.equal(parseUserfieldType('integer'), 'number-integral');
  assert.throws(() => parseUserfieldName('время готовки'), /--name must contain only/);
  assert.throws(() => parseUserfieldType('duration'), /Unsupported userfield type/);
});

test('requires caption and type', () => {
  assert.throws(
    () => buildUserfieldPayload({ entity: 'recipes', type: 'text' }),
    /Missing required option: --caption/,
  );
  assert.throws(
    () => buildUserfieldPayload({ entity: 'recipes', caption: 'Время готовки' }),
    /Missing required option: --type/,
  );
});

test('runs userfields-create json command', async () => {
  let createdPayload;

  const output = await runUserfieldsCreateCommand({
    format: 'json',
    options: {
      entity: 'recipes',
      caption: 'Время готовки',
      type: 'text-single-line',
    },
    client: {
      createUserfield: async (payload) => {
        createdPayload = payload;
        return { created_object_id: 14 };
      },
    },
  });

  assert.deepEqual(createdPayload, {
    entity: 'recipes',
    name: 'vremya_gotovki',
    caption: 'Время готовки',
    type: 'text-single-line',
  });
  assert.equal(output, JSON.stringify({
    action: 'created',
    entity: 'userfields',
    payload: createdPayload,
    result: { created_object_id: 14 },
  }, null, 2));
});
