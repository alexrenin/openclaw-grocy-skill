'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeUserfieldValues,
  runRecipeUserfieldsGetCommand,
} = require('../src/commands/recipe-userfields-get');

test('normalizes recipe userfield values', () => {
  assert.deepEqual(normalizeUserfieldValues({
    source: 'chat',
    difficulty: 2,
    extra: { nested: true },
  }), [
    { name: 'difficulty', value: '2' },
    { name: 'extra', value: '{"nested":true}' },
    { name: 'source', value: 'chat' },
  ]);
});

test('runs recipe-userfields-get json command', async () => {
  let requestedEntity;
  let requestedObjectId;

  const output = await runRecipeUserfieldsGetCommand({
    format: 'json',
    options: {
      'recipe-id': '42',
    },
    client: {
      getObjectUserfields: async (entity, objectId) => {
        requestedEntity = entity;
        requestedObjectId = objectId;

        return { source: 'chat' };
      },
    },
  });

  assert.equal(requestedEntity, 'recipes');
  assert.equal(requestedObjectId, 42);
  assert.equal(output, JSON.stringify({ source: 'chat' }, null, 2));
});

test('runs recipe-userfields-get table command', async () => {
  const output = await runRecipeUserfieldsGetCommand({
    format: 'table',
    options: {
      'recipe-id': '42',
    },
    client: {
      getObjectUserfields: async () => ({ source: 'chat' }),
    },
  });

  assert.match(output, /source/);
  assert.match(output, /chat/);
});

test('rejects missing recipe id', async () => {
  await assert.rejects(
    () => runRecipeUserfieldsGetCommand({
      format: 'json',
      options: {},
      client: {
        getObjectUserfields: async () => ({}),
      },
    }),
    /--recipe-id must be a positive integer/,
  );
});
