'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { parseArgs, validateOptions } = require('../bin/grocy-openclaw');

test('parses long options with separate values', () => {
  assert.deepEqual(parseArgs([
    'product-create',
    '--name',
    'Молоко',
    '--stock-unit',
    'л',
    '--format',
    'json',
  ]), {
    command: 'product-create',
    format: 'json',
    options: {
      name: 'Молоко',
      'stock-unit': 'л',
    },
  });
});

test('parses long options with inline values', () => {
  assert.deepEqual(parseArgs([
    'product-create',
    '--name=Молоко',
    '--stock-unit=л',
    '--format=json',
  ]), {
    command: 'product-create',
    format: 'json',
    options: {
      name: 'Молоко',
      'stock-unit': 'л',
    },
  });
});

test('rejects unsupported options for a command', () => {
  assert.throws(
    () => validateOptions('products', { name: 'Молоко' }),
    /Unsupported option for products: --name/,
  );
});

test('allows unit-create options', () => {
  assert.doesNotThrow(() => validateOptions('unit-create', {
    name: 'банка',
    'name-plural': 'банки',
    description: 'Стеклянная банка',
  }));
});

test('allows product-create conversion factor options', () => {
  assert.doesNotThrow(() => validateOptions('product-create', {
    name: 'Огурцы маринованные',
    'stock-unit': 'шт',
    'purchase-unit': 'банка',
    'purchase-to-stock-factor': '10',
    'consume-unit': 'шт',
    'consume-to-stock-factor': '1',
  }));
});

test('allows api-docs without command options', () => {
  assert.doesNotThrow(() => validateOptions('api-docs', {}));
});

test('allows recipe-create options', () => {
  assert.doesNotThrow(() => validateOptions('recipe-create', {
    name: 'Оливье',
    description: 'Домашний рецепт',
    'base-servings': '4',
    'desired-servings': '4',
    ingredients: '[{"name":"Картофель","amount":3,"unit":"шт"}]',
  }));
});

test('allows userfield command options', () => {
  assert.doesNotThrow(() => validateOptions('userfields', {
    entity: 'recipes',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-get', {
    entity: 'recipes',
    'object-id': '42',
  }));
});
