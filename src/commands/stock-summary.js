'use strict';

async function runStockSummaryCommand({ client, format }) {
  const [products, stock, volatileStock, quantityUnits] = await Promise.all([
    client.getProducts(),
    client.getStock(),
    client.getStockVolatile(),
    client.getQuantityUnits(),
  ]);

  const summary = buildStockSummary({
    products,
    stock,
    volatileStock,
    quantityUnitsById: mapById(quantityUnits),
  });

  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  return formatStockSummaryText(summary);
}

function buildStockSummary({ products, stock, volatileStock, quantityUnitsById }) {
  const trackedProducts = (products || []).filter(isTrackedProduct);
  const trackedProductIds = new Set(trackedProducts.map((product) => Number(product.id)));
  const currentStock = (stock || []).filter((item) => {
    const productId = Number(item.product_id);
    return trackedProductIds.has(productId) && getStockAmount(item) > 0;
  });
  const inStockProductIds = new Set(currentStock.map((item) => Number(item.product_id)));
  const volatile = volatileStock || {};

  return {
    counts: {
      configured_products: trackedProducts.length,
      in_stock_products: inStockProductIds.size,
      out_of_stock_products: Math.max(trackedProducts.length - inStockProductIds.size, 0),
      below_minimum_products: countUniqueProducts(volatile.missing_products, 'id'),
      due_soon_products: countUniqueProducts(volatile.due_products, 'product_id'),
      overdue_products: countUniqueProducts(volatile.overdue_products, 'product_id'),
      expired_products: countUniqueProducts(volatile.expired_products, 'product_id'),
    },
    nearest_due: findNearestDue(currentStock, quantityUnitsById),
  };
}

function formatStockSummaryText(summary) {
  const { counts, nearest_due: nearestDue } = summary;
  const lines = [
    'Сводка запасов:',
    '',
    `• Учитываемых товаров: ${counts.configured_products}`,
    `• В наличии: ${counts.in_stock_products}`,
    `• Нет в наличии: ${counts.out_of_stock_products}`,
    `• Ниже минимального запаса: ${counts.below_minimum_products}`,
    `• Срок скоро наступит: ${counts.due_soon_products}`,
    `• Срок прошёл: ${counts.overdue_products}`,
    `• Просрочено: ${counts.expired_products}`,
  ];

  if (nearestDue) {
    const amount = [formatNumber(nearestDue.amount), nearestDue.unit].filter(Boolean).join(' ');
    const amountSuffix = amount ? ` — ${amount}` : '';
    lines.push('', `Ближайший срок: ${nearestDue.name}${amountSuffix}, ${nearestDue.best_before_date}`);
  } else {
    lines.push('', 'Ближайший срок: нет данных.');
  }

  return lines.join('\n');
}

function findNearestDue(stockItems, quantityUnitsById) {
  const nearest = (stockItems || [])
    .filter((item) => isMeaningfulDueDate(item.best_before_date))
    .sort((left, right) => String(left.best_before_date).localeCompare(String(right.best_before_date)))[0];

  if (!nearest) {
    return null;
  }

  const product = nearest.product || {};
  const unit = quantityUnitsById.get(Number(product.qu_id_stock));

  return {
    product_id: nearest.product_id,
    name: product.name || '',
    amount: getStockAmount(nearest),
    unit: unit?.name || '',
    best_before_date: nearest.best_before_date,
  };
}

function getStockAmount(item) {
  if (isTruthyFlag(item.is_aggregated_amount)) {
    const aggregatedAmount = toFiniteNumber(item.amount_aggregated);
    if (aggregatedAmount !== null) {
      return aggregatedAmount;
    }
  }

  return toFiniteNumber(item.amount) || 0;
}

function isTrackedProduct(product) {
  return !isFalseFlag(product.active) && !isTruthyFlag(product.no_own_stock);
}

function isTruthyFlag(value) {
  return value === true || value === 1 || String(value).toLowerCase() === 'true' || value === '1';
}

function isFalseFlag(value) {
  return value === false || value === 0 || String(value).toLowerCase() === 'false' || value === '0';
}

function isMeaningfulDueDate(value) {
  const date = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < '2999-01-01';
}

function countUniqueProducts(items, idKey) {
  const values = items || [];
  const ids = values
    .map((item) => item?.[idKey])
    .filter((id) => id !== undefined && id !== null && id !== '');

  return ids.length === values.length ? new Set(ids.map(Number)).size : values.length;
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  return Number.isFinite(value) ? String(value) : '';
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  buildStockSummary,
  findNearestDue,
  formatStockSummaryText,
  getStockAmount,
  runStockSummaryCommand,
};
