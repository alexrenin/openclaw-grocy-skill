'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildExpiringStockReport,
  formatExpiringStockText,
  parseDueSoonDays,
  runStockExpiringCommand,
} = require('../src/commands/stock-expiring');

test('parses due-soon days with a default', () => {
  assert.equal(parseDueSoonDays(undefined), 5);
  assert.equal(parseDueSoonDays('0'), 0);
  assert.equal(parseDueSoonDays('14'), 14);
});

test('rejects invalid due-soon days', () => {
  assert.throws(() => parseDueSoonDays('-1'), /non-negative integer/);
  assert.throws(() => parseDueSoonDays('1.5'), /non-negative integer/);
  assert.throws(() => parseDueSoonDays(''), /non-negative integer/);
  assert.throws(() => parseDueSoonDays('2e1'), /non-negative integer/);
  assert.throws(() => parseDueSoonDays('soon'), /non-negative integer/);
});

test('builds an expiring stock report from Grocy categories', () => {
  const report = buildExpiringStockReport({
    volatileStock: {
      due_products: [{
        product_id: 3,
        amount: '2',
        best_before_date: '2026-07-20',
        product: { name: 'Yogurt', qu_id_stock: 4 },
      }],
      overdue_products: [{
        product_id: 2,
        amount: 1,
        best_before_date: '2026-07-10',
        product: { name: 'Bread', qu_id_stock: 4 },
      }],
      expired_products: [{
        product_id: 1,
        amount: 0,
        amount_aggregated: '6',
        is_aggregated_amount: 1,
        best_before_date: '2026-07-01',
        product: { name: 'Eggs', qu_id_stock: 5 },
      }],
    },
    quantityUnitsById: new Map([
      [4, { id: 4, name: 'pack' }],
      [5, { id: 5, name: 'pc' }],
    ]),
    dueSoonDays: 7,
  });

  assert.deepEqual(report, {
    due_soon_days: 7,
    counts: { due_soon: 1, overdue: 1, expired: 1 },
    items: [
      {
        status: 'expired',
        product_id: 1,
        name: 'Eggs',
        amount: 6,
        unit: 'pc',
        best_before_date: '2026-07-01',
      },
      {
        status: 'overdue',
        product_id: 2,
        name: 'Bread',
        amount: 1,
        unit: 'pack',
        best_before_date: '2026-07-10',
      },
      {
        status: 'due_soon',
        product_id: 3,
        name: 'Yogurt',
        amount: 2,
        unit: 'pack',
        best_before_date: '2026-07-20',
      },
    ],
  });
});

test('formats expiring stock as grouped Russian text', () => {
  const output = formatExpiringStockText({
    due_soon_days: 7,
    counts: { due_soon: 1, overdue: 0, expired: 1 },
    items: [
      {
        status: 'expired', product_id: 1, name: 'Eggs', amount: 6, unit: 'pc', best_before_date: '2026-07-01',
      },
      {
        status: 'due_soon', product_id: 3, name: 'Yogurt', amount: 2, unit: 'pack', best_before_date: '2026-07-20',
      },
    ],
  });

  assert.match(output, /Сроки запасов \(окно: 7 дн\.\):/);
  assert.match(output, /Просрочено:/);
  assert.match(output, /• Eggs — 6 pc, 2026-07-01/);
  assert.match(output, /Срок скоро наступит:/);
});

test('formats an empty expiring stock report', () => {
  assert.equal(
    formatExpiringStockText({ due_soon_days: 5, items: [] }),
    'Товаров с наступившим или приближающимся сроком нет (окно: 5 дн.).',
  );
});

test('runs stock-expiring as JSON and passes the requested window', async () => {
  let requestedWindow;
  const output = await runStockExpiringCommand({
    format: 'json',
    options: { days: '14' },
    client: {
      getStockVolatile: async ({ dueSoonDays }) => {
        requestedWindow = dueSoonDays;
        return { due_products: [], overdue_products: [], expired_products: [] };
      },
      getQuantityUnits: async () => [],
    },
  });

  assert.equal(requestedWindow, 14);
  assert.deepEqual(JSON.parse(output), {
    due_soon_days: 14,
    counts: { due_soon: 0, overdue: 0, expired: 0 },
    items: [],
  });
});

test('runs stock-expiring as a table', async () => {
  const output = await runStockExpiringCommand({
    format: 'table',
    options: {},
    client: {
      getStockVolatile: async () => ({
        due_products: [{
          product_id: 3,
          amount: 2,
          best_before_date: '2026-07-20',
          product: { name: 'Yogurt', qu_id_stock: 4 },
        }],
      }),
      getQuantityUnits: async () => [{ id: 4, name: 'pack' }],
    },
  });

  assert.match(output, /status/);
  assert.match(output, /best_before_date/);
  assert.match(output, /Yogurt/);
});
