'use strict';

const {
  findQuantityUnit,
  findQuantityUnitMatches,
  formatUnitChoices,
} = require('./product-create');
const { findProductByName } = require('./recipe-create');

async function runStockAddCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for stock-add: ${format}`);
  }

  const [products, quantityUnits] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
  ]);
  const plan = buildStockAddPlan(options, products, quantityUnits);
  const result = await client.addStockProduct(plan.product.id, plan.payload);

  return JSON.stringify({
    action: 'added',
    entity: 'stock',
    product: plan.product,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildStockAddPlan(options, products, quantityUnits) {
  const product = resolveProductOption({
    idValue: options['product-id'],
    nameValue: options.product ?? options.name,
    products,
  });
  const amount = parsePositiveNumber(options.amount, '--amount');
  const payload = {
    amount,
    transaction_type: normalizeText(options['transaction-type']) || 'purchase',
  };
  const unitName = normalizeText(options.unit);
  const unitId = options['unit-id'] ? parsePositiveInteger(options['unit-id'], '--unit-id') : undefined;

  if (unitName && unitId) {
    throw new Error('Specify either --unit or --unit-id, not both.');
  }

  if (unitName || unitId) {
    const requestedUnitId = unitId ?? resolveQuantityUnitId(unitName, quantityUnits);
    const stockUnitId = Number(product.qu_id_stock);

    if (Number.isInteger(stockUnitId) && stockUnitId > 0 && Number(requestedUnitId) !== stockUnitId) {
      throw new Error(`stock-add amount must be in the product stock unit. Product ${product.id}:${product.name} stock unit is ${formatStockUnit(product, quantityUnits)}.`);
    }
  }

  if (options.price != null && options.price !== '') {
    payload.price = parseNonNegativeNumber(options.price, '--price');
  }

  if (options['best-before-date'] != null && options['best-before-date'] !== '') {
    payload.best_before_date = parseDate(options['best-before-date'], '--best-before-date');
  }

  return {
    product: {
      id: Number(product.id),
      name: product.name || '',
      qu_id_stock: product.qu_id_stock == null ? null : Number(product.qu_id_stock),
    },
    payload,
  };
}

function resolveProductOption({ idValue, nameValue, products }) {
  if (idValue && nameValue) {
    throw new Error('Specify either --product-id or --product, not both.');
  }

  if (idValue) {
    const id = parsePositiveInteger(idValue, '--product-id');
    const product = products.find((candidate) => Number(candidate.id) === id);

    if (!product) {
      throw new Error(`Unknown product id: ${id}. Available products: ${formatProductChoices(products)}`);
    }

    return product;
  }

  const name = normalizeText(nameValue);

  if (!name) {
    throw new Error('Missing required option: --product or --product-id');
  }

  const product = findProductByName(name, products);

  if (!product) {
    throw new Error(`Unknown product: ${name}. Available products: ${formatProductChoices(products)}`);
  }

  return product;
}

function resolveQuantityUnitId(unitName, quantityUnits) {
  const unitMatches = findQuantityUnitMatches(unitName, quantityUnits);
  const unit = findQuantityUnit(unitName, quantityUnits);

  if (!unit) {
    if (unitMatches.length > 1) {
      throw new Error(`Ambiguous stock unit: ${unitName}. Matches: ${formatUnitChoices(unitMatches)}`);
    }

    throw new Error(`Unknown stock unit: ${unitName}. Available units: ${formatUnitChoices(quantityUnits)}`);
  }

  return Number(unit.id);
}

function formatStockUnit(product, quantityUnits) {
  const unit = quantityUnits.find((candidate) => Number(candidate.id) === Number(product.qu_id_stock));

  if (!unit) {
    return product.qu_id_stock == null ? 'unknown' : `unit id ${product.qu_id_stock}`;
  }

  return `${unit.id}:${unit.name || 'unnamed'}`;
}

function formatProductChoices(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return 'none';
  }

  return products
    .map((product) => `${product.id}:${product.name || 'unnamed'}`)
    .join(', ');
}

function parsePositiveInteger(value, label) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return numberValue;
}

function parsePositiveNumber(value, label) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return numberValue;
}

function parseNonNegativeNumber(value, label) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }

  return numberValue;
}

function parseDate(value, label) {
  const normalized = normalizeText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${normalized}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error(`${label} must be a valid calendar date`);
  }

  return normalized;
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

module.exports = {
  buildStockAddPlan,
  formatProductChoices,
  parseDate,
  runStockAddCommand,
};
