'use strict';

const { resolveLocationOption } = require('./product-create');
const {
  extractTransactionIds,
  parseDate,
  parseNonNegativeNumber,
  parsePositiveInteger,
  resolveProductOption,
  resolveQuantityUnitId,
} = require('./stock-add');

async function runStockInventoryCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for stock-inventory: ${format}`);
  }

  const [products, quantityUnits, locations, stock] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getLocations(),
    client.getStock(),
  ]);
  const plan = buildStockInventoryPlan(options, products, quantityUnits, locations, stock);
  const result = await client.inventoryStockProduct(plan.product.id, plan.payload);

  return JSON.stringify({
    action: 'inventoried',
    entity: 'stock',
    product: plan.product,
    current_amount: plan.current_amount,
    new_amount: plan.new_amount,
    delta: plan.delta,
    payload: plan.payload,
    transaction_ids: extractTransactionIds(result),
    result,
  }, null, 2);
}

function buildStockInventoryPlan(options, products, quantityUnits, locations, stock) {
  const product = resolveProductOption({
    idValue: options['product-id'],
    nameValue: options.product ?? options.name,
    products,
  });
  const newAmount = parseNonNegativeNumber(options['new-amount'], '--new-amount');
  validateStockUnitOption(options, product, quantityUnits, '--new-amount');

  const payload = {
    new_amount: newAmount,
  };

  addOptionalStockEntryFields(payload, options, locations);

  const currentAmount = findCurrentStockAmount(product.id, stock);

  return {
    product: summarizeProduct(product),
    current_amount: currentAmount,
    new_amount: newAmount,
    delta: currentAmount == null ? null : newAmount - currentAmount,
    payload,
  };
}

function addOptionalStockEntryFields(payload, options, locations) {
  if (options['best-before-date'] != null && options['best-before-date'] !== '') {
    payload.best_before_date = parseDate(options['best-before-date'], '--best-before-date');
  }

  if (options.price != null && options.price !== '') {
    payload.price = parseNonNegativeNumber(options.price, '--price');
  }

  if (options.note != null && options.note !== '') {
    payload.note = String(options.note);
  }

  const locationId = resolveLocationOption({
    idValue: options['location-id'],
    nameValue: options.location,
    locations,
    required: false,
  });

  if (locationId != null) {
    payload.location_id = locationId;
  }
}

function validateStockUnitOption(options, product, quantityUnits, amountOption) {
  const unitName = normalizeText(options.unit);
  const unitId = options['unit-id'] ? parsePositiveInteger(options['unit-id'], '--unit-id') : undefined;

  if (unitName && unitId) {
    throw new Error('Specify either --unit or --unit-id, not both.');
  }

  if (!unitName && !unitId) {
    return;
  }

  const requestedUnitId = unitId ?? resolveQuantityUnitId(unitName, quantityUnits);
  const stockUnitId = Number(product.qu_id_stock);

  if (Number.isInteger(stockUnitId) && stockUnitId > 0 && Number(requestedUnitId) !== stockUnitId) {
    throw new Error(`${amountOption} must be in the product stock unit.`);
  }
}

function findCurrentStockAmount(productId, stock) {
  const row = (stock || []).find((item) => Number(item.product_id) === Number(productId));

  if (!row || row.amount == null || row.amount === '') {
    return 0;
  }

  const amount = Number(row.amount);

  return Number.isFinite(amount) ? amount : null;
}

function summarizeProduct(product) {
  return {
    id: Number(product.id),
    name: product.name || '',
    qu_id_stock: product.qu_id_stock == null ? null : Number(product.qu_id_stock),
  };
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

module.exports = {
  buildStockInventoryPlan,
  validateStockUnitOption,
  runStockInventoryCommand,
};
