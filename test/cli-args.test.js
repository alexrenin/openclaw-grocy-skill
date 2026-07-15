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

test('allows product-search options', () => {
  assert.doesNotThrow(() => validateOptions('product-search', {
    name: 'Молоко',
  }));
});

test('allows shopping list write command options', () => {
  assert.doesNotThrow(() => validateOptions('shopping-list-add', {
    product: 'Milk', amount: '2', unit: 'bottle', note: 'sale', 'list-id': '1',
  }));
  assert.doesNotThrow(() => validateOptions('shopping-list-update', {
    'item-id': '12', 'product-id': '2', amount: '1', 'unit-id': '3', note: '',
  }));
  assert.doesNotThrow(() => validateOptions('shopping-list-delete', { 'item-id': '12' }));
  assert.doesNotThrow(() => validateOptions('shopping-list-done', { 'item-id': '12', done: 'false' }));
  assert.doesNotThrow(() => validateOptions('shopping-list-clean', { 'list-id': '1', 'dry-run': 'true' }));
});

test('allows unit-create options', () => {
  assert.doesNotThrow(() => validateOptions('unit-create', {
    name: 'банка',
    'name-plural': 'банки',
    description: 'Стеклянная банка',
  }));
});

test('allows unit lifecycle options', () => {
  assert.doesNotThrow(() => validateOptions('unit-update', {
    unit: 'jar',
    name: 'glass jar',
    'name-plural': 'glass jars',
    description: '',
  }));
  assert.doesNotThrow(() => validateOptions('unit-update', {
    'unit-id': '7',
  }));
  assert.doesNotThrow(() => validateOptions('unit-delete', {
    'unit-id': '7',
    'confirm-unit-name': 'jar',
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

test('allows product lifecycle options', () => {
  assert.doesNotThrow(() => validateOptions('product-update', {
    product: 'Milk',
    name: 'Milk 2.5%',
    description: '',
    active: 'false',
    location: 'Fridge',
    'stock-unit': 'л',
    'purchase-unit': 'банка',
    'purchase-to-stock-factor': '1',
    'consume-unit': 'мл',
    'consume-to-stock-factor': '0.001',
  }));
  assert.doesNotThrow(() => validateOptions('product-update', {
    'product-id': '42',
    'location-id': '2',
    'stock-unit-id': '3',
    'purchase-unit-id': '3',
    'consume-unit-id': '3',
  }));
  assert.doesNotThrow(() => validateOptions('product-delete', {
    'product-id': '42',
    'confirm-product-name': 'Milk',
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
    'create-missing-products': 'true',
  }));
});

test('allows recipe lifecycle options', () => {
  assert.doesNotThrow(() => validateOptions('recipe-update', {
    recipe: 'Оливье',
    name: 'Оливье быстрый',
    description: '',
    'base-servings': '4',
    'desired-servings': '4',
  }));
  assert.doesNotThrow(() => validateOptions('recipe-update', {
    'recipe-id': '11',
    name: 'Potato salad',
  }));
  assert.doesNotThrow(() => validateOptions('recipe-delete', {
    'recipe-id': '11',
    'confirm-recipe-name': 'Potato salad',
    'delete-ingredients': 'true',
  }));
});

test('allows recipe-ingredient-add options', () => {
  assert.doesNotThrow(() => validateOptions('recipe-ingredient-add', {
    recipe: 'Блины',
    product: 'Масло подсолнечное',
    amount: '30',
    unit: 'мл',
    note: 'в тесто',
    'ingredient-group': 'Тесто',
    location: 'Кладовка',
    'stock-unit': 'мл',
    'create-missing-products': 'true',
  }));
});

test('allows recipe-ingredient-update options', () => {
  assert.doesNotThrow(() => validateOptions('recipe-ingredient-update', {
    recipe: 'Блины',
    product: 'Масло подсолнечное',
    amount: '0.03',
    unit: 'л',
    note: 'в тесто',
    'ingredient-group': 'Тесто',
    'round-up': 'false',
  }));
});

test('allows recipe-ingredient-delete options', () => {
  assert.doesNotThrow(() => validateOptions('recipe-ingredient-delete', {
    recipe: 'Блины',
    product: 'Масло подсолнечное',
  }));
  assert.doesNotThrow(() => validateOptions('recipe-ingredient-delete', {
    'position-id': '12',
  }));
});

test('allows userfield command options', () => {
  assert.doesNotThrow(() => validateOptions('userfields', {
    entity: 'recipes',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-create', {
    entity: 'recipes',
    name: 'cook_time',
    caption: 'Время готовки',
    type: 'text-single-line',
    'show-as-column': 'true',
    'input-required': 'false',
    'sort-number': '10',
    config: 'one\nper\nline',
    'default-value': '30 минут',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-update', {
    entity: 'recipes', field: 'cook_time', caption: 'Cooking time',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-delete', {
    'userfield-id': '14', 'confirm-field-name': 'cook_time', 'delete-values': 'true',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-get', {
    entity: 'recipes',
    'object-id': '42',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-set', {
    entity: 'recipes',
    'object-name': 'Быстрые блины',
    values: '{"difficulty":"легкий"}',
  }));
  assert.doesNotThrow(() => validateOptions('userfields-set', {
    entity: 'recipes',
    'object-id': '42',
    field: 'Время готовки',
    value: '10 минут',
  }));
});

test('allows stock-add options', () => {
  assert.doesNotThrow(() => validateOptions('stock-add', {
    product: 'Молоко',
    amount: '1',
    unit: 'л',
    price: '2.49',
    'best-before-date': '2026-07-20',
  }));
  assert.doesNotThrow(() => validateOptions('stock-add', {
    'product-id': '42',
    amount: '0.5',
    'unit-id': '2',
    'transaction-type': 'purchase',
  }));
});

test('allows stock-expiring options', () => {
  assert.doesNotThrow(() => validateOptions('stock-expiring', {
    days: '7',
  }));
});

test('allows stock-transaction-undo options', () => {
  assert.doesNotThrow(() => validateOptions('stock-transaction-undo', {
    'transaction-id': 'tx-1',
  }));
});
