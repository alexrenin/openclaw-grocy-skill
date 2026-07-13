'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { formatShoppingList } = require('../src/format-shopping-list');

test('formats a normal shopping list', () => {
  const actual = formatShoppingList([
    { product_name: 'Заправка для Борща MAGGI', amount: 2, unit_name: 'Упаковка' },
    { product_name: 'Картофель', amount: 0.5, unit_name: 'кг' },
    { product_name: 'Свинина', amount: 0.6, unit_name: 'кг' },
    { product_name: 'Сметана', amount: 0.4, unit_name: 'кг' },
  ]);

  assert.equal(actual, [
    'Список покупок:',
    '',
    '• Заправка для Борща MAGGI — 2 Упаковка',
    '• Картофель — 0.5 кг',
    '• Свинина — 0.6 кг',
    '• Сметана — 0.4 кг',
  ].join('\n'));
});

test('formats an empty shopping list', () => {
  assert.equal(formatShoppingList([]), 'Список покупок пуст.');
});

test('formats an item without unit', () => {
  const actual = formatShoppingList([
    { product_name: 'Лимоны', amount: 3 },
  ]);

  assert.equal(actual, [
    'Список покупок:',
    '',
    '• Лимоны — 3',
  ].join('\n'));
});

test('formats an item with note', () => {
  const actual = formatShoppingList([
    { product_name: 'Молоко', amount: 1, unit_name: 'л', note: 'без лактозы' },
  ]);

  assert.equal(actual, [
    'Список покупок:',
    '',
    '• Молоко — 1 л — без лактозы',
  ].join('\n'));
});

test('ignores completed items by default', () => {
  const actual = formatShoppingList([
    { product_name: 'Хлеб', amount: 1, unit_name: 'шт', done: 1 },
    { product_name: 'Яйца', amount: 10, unit_name: 'шт' },
  ]);

  assert.equal(actual, [
    'Список покупок:',
    '',
    '• Яйца — 10 шт',
  ].join('\n'));
});
