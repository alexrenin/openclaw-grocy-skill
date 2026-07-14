'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeUserfieldValues,
  parseObjectId,
  runUserfieldsGetCommand,
} = require('../src/commands/userfields-get');

test('normalizes userfield values', () => {
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

test('validates object ids', () => {
  assert.equal(parseObjectId('42'), '42');
  assert.equal(parseObjectId('abc-123'), 'abc-123');
  assert.throws(() => parseObjectId(''), /Missing required option: --object-id/);
  assert.throws(() => parseObjectId('bad/id'), /--object-id must contain only/);
});

test('runs userfields-get json command', async () => {
  let requestedEntity;
  let requestedObjectId;

  const output = await runUserfieldsGetCommand({
    format: 'json',
    options: {
      entity: 'recipes',
      'object-id': '42',
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
  assert.equal(requestedObjectId, '42');
  assert.equal(output, JSON.stringify({ source: 'chat' }, null, 2));
});

test('runs userfields-get table command', async () => {
  const output = await runUserfieldsGetCommand({
    format: 'table',
    options: {
      entity: 'products',
      'object-id': '42',
    },
    client: {
      getObjectUserfields: async () => ({ brand: 'Acme' }),
    },
  });

  assert.match(output, /brand/);
  assert.match(output, /Acme/);
});

test('rejects missing entity', async () => {
  await assert.rejects(
    () => runUserfieldsGetCommand({
      format: 'json',
      options: {
        'object-id': '42',
      },
      client: {
        getObjectUserfields: async () => ({}),
      },
    }),
    /Missing required option: --entity/,
  );
});
