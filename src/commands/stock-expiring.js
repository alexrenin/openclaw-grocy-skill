'use strict';

const { formatTable } = require('../format-table');
const { getStockAmount } = require('./stock-summary');

const DEFAULT_DUE_SOON_DAYS = 5;

async function runStockExpiringCommand({ client, format, options }) {
  const dueSoonDays = parseDueSoonDays(options?.days);
  const [volatileStock, quantityUnits] = await Promise.all([
    client.getStockVolatile({ dueSoonDays }),
    client.getQuantityUnits(),
  ]);
  const report = buildExpiringStockReport({
    volatileStock,
    quantityUnitsById: mapById(quantityUnits),
    dueSoonDays,
  });

  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  if (format === 'table') {
    return formatTable(report.items, [
      { key: 'status', label: 'status' },
      { key: 'product_id', label: 'product_id' },
      { key: 'name', label: 'name' },
      { key: 'amount', label: 'amount' },
      { key: 'unit', label: 'unit' },
      { key: 'best_before_date', label: 'best_before_date' },
    ]);
  }

  return formatExpiringStockText(report);
}

function buildExpiringStockReport({ volatileStock, quantityUnitsById, dueSoonDays }) {
  const volatile = volatileStock || {};
  const items = [
    ...normalizeExpiringItems(volatile.expired_products, 'expired', quantityUnitsById),
    ...normalizeExpiringItems(volatile.overdue_products, 'overdue', quantityUnitsById),
    ...normalizeExpiringItems(volatile.due_products, 'due_soon', quantityUnitsById),
  ].sort(compareExpiringItems);

  return {
    due_soon_days: dueSoonDays,
    counts: {
      due_soon: items.filter((item) => item.status === 'due_soon').length,
      overdue: items.filter((item) => item.status === 'overdue').length,
      expired: items.filter((item) => item.status === 'expired').length,
    },
    items,
  };
}

function normalizeExpiringItems(items, status, quantityUnitsById) {
  return (items || []).map((item) => {
    const product = item.product || {};
    const unit = quantityUnitsById.get(Number(product.qu_id_stock));

    return {
      status,
      product_id: item.product_id,
      name: product.name || '',
      amount: getStockAmount(item),
      unit: unit?.name || '',
      best_before_date: item.best_before_date || '',
    };
  });
}

function formatExpiringStockText(report) {
  const { due_soon_days: dueSoonDays, items } = report;

  if (!items || items.length === 0) {
    return `Товаров с наступившим или приближающимся сроком нет (окно: ${dueSoonDays} дн.).`;
  }

  const lines = [`Сроки запасов (окно: ${dueSoonDays} дн.):`];
  const sections = [
    ['expired', 'Просрочено'],
    ['overdue', 'Срок прошёл'],
    ['due_soon', 'Срок скоро наступит'],
  ];

  for (const [status, label] of sections) {
    const sectionItems = items.filter((item) => item.status === status);
    if (sectionItems.length === 0) {
      continue;
    }

    lines.push('', `${label}:`);
    for (const item of sectionItems) {
      const amount = [formatNumber(item.amount), item.unit].filter(Boolean).join(' ');
      const amountSuffix = amount ? ` — ${amount}` : '';
      lines.push(`• ${item.name}${amountSuffix}, ${item.best_before_date}`);
    }
  }

  return lines.join('\n');
}

function parseDueSoonDays(value) {
  if (value === undefined) {
    return DEFAULT_DUE_SOON_DAYS;
  }

  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
    throw new Error('Invalid --days. Use a non-negative integer.');
  }

  const days = Number(value);
  if (!Number.isSafeInteger(days) || days < 0) {
    throw new Error('Invalid --days. Use a non-negative integer.');
  }

  return days;
}

function compareExpiringItems(left, right) {
  const statusOrder = { expired: 0, overdue: 1, due_soon: 2 };
  const byStatus = statusOrder[left.status] - statusOrder[right.status];
  if (byStatus !== 0) {
    return byStatus;
  }

  const byDate = String(left.best_before_date).localeCompare(String(right.best_before_date));
  return byDate || left.name.localeCompare(right.name, 'ru');
}

function formatNumber(value) {
  return Number.isFinite(value) ? String(value) : '';
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  DEFAULT_DUE_SOON_DAYS,
  buildExpiringStockReport,
  formatExpiringStockText,
  normalizeExpiringItems,
  parseDueSoonDays,
  runStockExpiringCommand,
};
