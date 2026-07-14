'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeSearchText,
  runProductSearchCommand,
  searchProducts,
} = require('../src/commands/product-search');

test('normalizes search text for case and punctuation-insensitive matching', () => {
  assert.equal(normalizeSearchText('  Молоко, 2.5%  '), 'молоко 2 5');
});

test('searches products and ranks exact name matches first', () => {
  const rows = searchProducts({
    query: 'Молоко',
    products: [
      { id: 2, name: 'Молоко безлактозное', qu_id_stock: 1 },
      { id: 1, name: 'Молоко', description: '2.5%', qu_id_stock: 1, qu_id_purchase: 2 },
      { id: 3, name: 'Кефир', qu_id_stock: 1 },
    ],
    quantityUnits: [
      { id: 1, name: 'л' },
      { id: 2, name: 'бутылка' },
    ],
  });

  assert.deepEqual(rows, [
    {
      id: 1,
      name: 'Молоко',
      description: '2.5%',
      stock_unit: 'л',
      purchase_unit: 'бутылка',
      match_score: 100,
      match_reason: 'exact_name',
    },
    {
      id: 2,
      name: 'Молоко безлактозное',
      description: '',
      stock_unit: 'л',
      purchase_unit: '',
      match_score: 90,
      match_reason: 'name_prefix',
    },
  ]);
});

test('keeps partial term matches for receipt-like product names', () => {
  const rows = searchProducts({
    query: 'Молоко фермерское 2.5',
    products: [
      { id: 1, name: 'Молоко', description: '2.5%', qu_id_stock: 1 },
      { id: 2, name: 'Хлеб', qu_id_stock: 2 },
    ],
    quantityUnits: [
      { id: 1, name: 'л' },
      { id: 2, name: 'шт' },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].match_reason, 'partial_terms');
});

test('runs product-search json command', async () => {
  const output = await runProductSearchCommand({
    format: 'json',
    options: { name: 'milk' },
    client: {
      getProducts: async () => [
        { id: 1, name: 'Milk', qu_id_stock: 2 },
        { id: 2, name: 'Bread', qu_id_stock: 3 },
      ],
      getQuantityUnits: async () => [
        { id: 2, name: 'l' },
        { id: 3, name: 'pc' },
      ],
    },
  });

  assert.equal(output, JSON.stringify([
    {
      id: 1,
      name: 'Milk',
      description: '',
      stock_unit: 'l',
      purchase_unit: '',
      match_score: 100,
      match_reason: 'exact_name',
    },
  ], null, 2));
});

test('runs product-search table command with no results', async () => {
  const output = await runProductSearchCommand({
    format: 'table',
    options: { name: 'milk' },
    client: {
      getProducts: async () => [{ id: 1, name: 'Bread' }],
      getQuantityUnits: async () => [],
    },
  });

  assert.equal(output, 'No data');
});

test('requires product-search name option', async () => {
  await assert.rejects(
    () => runProductSearchCommand({
      format: 'json',
      options: {},
      client: {
        getProducts: async () => [],
        getQuantityUnits: async () => [],
      },
    }),
    /Missing required option: --name/,
  );
});
