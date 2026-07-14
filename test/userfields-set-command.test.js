'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildUserfieldValuesPayload,
  normalizeUserfieldValue,
  parseValuesOption,
  resolveObjectOption,
  resolveUserfieldDefinition,
  runUserfieldsSetCommand,
} = require('../src/commands/userfields-set');

const definitions = [
  { name: 'difficulty', caption: 'Уровень сложности', type: 'preset-list' },
  { name: 'cook_time', caption: 'Время готовки', type: 'text-single-line' },
  { name: 'favorite', caption: 'Любимый', type: 'checkbox' },
  { name: 'servings', caption: 'Порции', type: 'number-integral' },
];
const objects = [
  { id: 7, name: 'Быстрые блины' },
];

test('parses values JSON object', () => {
  assert.deepEqual(parseValuesOption({
    values: '{"Уровень сложности":"легкий","Время готовки":"10 минут"}',
  }), {
    'Уровень сложности': 'легкий',
    'Время готовки': '10 минут',
  });
});

test('parses single field and value', () => {
  assert.deepEqual(parseValuesOption({
    field: 'Время готовки',
    value: '10 минут',
  }), {
    'Время готовки': '10 минут',
  });
});

test('resolves userfields by technical name or caption', () => {
  assert.equal(resolveUserfieldDefinition('difficulty', definitions).name, 'difficulty');
  assert.equal(resolveUserfieldDefinition('уровень сложности', definitions).name, 'difficulty');
});

test('normalizes typed userfield values', () => {
  assert.equal(normalizeUserfieldValue('да', definitions[2]), 1);
  assert.equal(normalizeUserfieldValue('4', definitions[3]), 4);
});

test('builds userfield values payload from captions', () => {
  assert.deepEqual(buildUserfieldValuesPayload({
    values: '{"Уровень сложности":"легкий","Время готовки":"10 минут"}',
  }, definitions), {
    difficulty: 'легкий',
    cook_time: '10 минут',
  });
});

test('resolves object by id or name', () => {
  assert.deepEqual(resolveObjectOption({ 'object-id': '7' }, objects), {
    id: '7',
    name: undefined,
  });
  assert.deepEqual(resolveObjectOption({ 'object-name': 'быстрые блины' }, objects), {
    id: '7',
    name: 'Быстрые блины',
  });
});

test('runs userfields-set json command', async () => {
  let updatedEntity;
  let updatedObjectId;
  let updatedPayload;

  const output = await runUserfieldsSetCommand({
    format: 'json',
    options: {
      entity: 'recipes',
      'object-name': 'Быстрые блины',
      values: '{"Уровень сложности":"легкий","Время готовки":"10 минут"}',
    },
    client: {
      getUserfields: async () => definitions.map((definition, index) => ({
        id: index + 1,
        entity: 'recipes',
        ...definition,
      })),
      getObjects: async (entity) => {
        assert.equal(entity, 'recipes');
        return objects;
      },
      setObjectUserfields: async (entity, objectId, payload) => {
        updatedEntity = entity;
        updatedObjectId = objectId;
        updatedPayload = payload;
        return null;
      },
    },
  });

  assert.equal(updatedEntity, 'recipes');
  assert.equal(updatedObjectId, '7');
  assert.deepEqual(updatedPayload, {
    difficulty: 'легкий',
    cook_time: '10 минут',
  });
  assert.deepEqual(JSON.parse(output), {
    action: 'updated',
    entity: 'userfields',
    target: {
      entity: 'recipes',
      objectId: '7',
      objectName: 'Быстрые блины',
    },
    payload: {
      difficulty: 'легкий',
      cook_time: '10 минут',
    },
    result: null,
  });
});
