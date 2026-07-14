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
