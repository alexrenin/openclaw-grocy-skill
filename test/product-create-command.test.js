'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildProductPayload,
  findQuantityUnit,
  findQuantityUnitMatches,
  runProductCreateCommand,
} = require('../src/commands/product-create');

const units = [
  { id: 1, name: 'шт', name_plural: 'шт' },
  { id: 2, name: 'кг', name_plural: 'кг' },
  { id: 3, name: 'л', name_plural: 'литры' },
];

test('builds product payload from unit names', () => {
  const payload = buildProductPayload({
    name: 'Молоко',
    description: '2.5%',
    'stock-unit': 'л',
    'purchase-unit': 'шт',
    'consume-unit': 'литры',
  }, units);

  assert.deepEqual(payload, {
    name: 'Молоко',
    description: '2.5%',
    qu_id_stock: 3,
    qu_id_purchase: 1,
    qu_id_consume: 3,
  });
});

test('defaults purchase and consume units to stock unit', () => {
  const payload = buildProductPayload({
    name: 'Картофель',
    'stock-unit-id': '2',
  }, units);

  assert.deepEqual(payload, {
    name: 'Картофель',
    qu_id_stock: 2,
    qu_id_purchase: 2,
    qu_id_consume: 2,
  });
});

test('matches natural unit aliases for chat input', () => {
  assert.equal(findQuantityUnit('килограмм', units).id, 2);
  assert.equal(findQuantityUnit('кило', units).id, 2);
  assert.equal(findQuantityUnit('kg', units).id, 2);
  assert.equal(findQuantityUnit('литр', units).id, 3);
  assert.equal(findQuantityUnit('штука', units).id, 1);
});

test('rejects missing product name', () => {
  assert.throws(
    () => buildProductPayload({ 'stock-unit': 'кг' }, units),
    /Missing required option: --name/,
  );
});

test('rejects unknown stock unit with available unit choices', () => {
  assert.throws(
    () => buildProductPayload({ name: 'Йогурт', 'stock-unit': 'банка' }, units),
    /Unknown stock unit: банка\. Available units: 1:шт, 2:кг, 3:л\/литры/,
  );
});

test('returns no single unit when matching is ambiguous', () => {
  const matches = findQuantityUnitMatches('бутылка', [
    { id: 1, name: 'бутылка' },
    { id: 2, name: 'Бутылка' },
  ]);

  assert.equal(matches.length, 2);
  assert.equal(findQuantityUnit('бутылка', [
    { id: 1, name: 'бутылка' },
    { id: 2, name: 'Бутылка' },
  ]), undefined);
});

test('throws readable ambiguity errors', () => {
  assert.throws(
    () => buildProductPayload({
      name: 'Вода',
      'stock-unit': 'бутылка',
    }, [
      { id: 1, name: 'бутылка' },
      { id: 2, name: 'Бутылка' },
    ]),
    /Ambiguous stock unit: бутылка\. Matches: 1:бутылка, 2:Бутылка/,
  );
});

test('finds quantity unit by id, name, and plural name', () => {
  assert.equal(findQuantityUnit('2', units).id, 2);
  assert.equal(findQuantityUnit('л', units).id, 3);
  assert.equal(findQuantityUnit('литры', units).id, 3);
});

test('runs product-create json command', async () => {
  let createdPayload;

  const output = await runProductCreateCommand({
    format: 'json',
    options: {
      name: 'Молоко',
      'stock-unit': 'л',
    },
    client: {
      getQuantityUnits: async () => units,
      createProduct: async (payload) => {
        createdPayload = payload;
        return { created_object_id: 42 };
      },
    },
  });

  assert.deepEqual(createdPayload, {
    name: 'Молоко',
    qu_id_stock: 3,
    qu_id_purchase: 3,
    qu_id_consume: 3,
  });
  assert.equal(output, JSON.stringify({
    action: 'created',
    entity: 'products',
    payload: createdPayload,
    result: { created_object_id: 42 },
  }, null, 2));
});
