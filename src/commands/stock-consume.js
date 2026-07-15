'use strict';

const {
  extractTransactionIds,
  parsePositiveInteger,
  parsePositiveNumber,
  parseStockTransactionType,
  resolveProductOption,
} = require('./stock-add');
const { validateStockUnitOption } = require('./stock-inventory');
const { resolveLocationOption } = require('./product-create');

async function runStockConsumeCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for stock-consume: ${format}`);
  }

  const [products, quantityUnits, locations] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getLocations(),
  ]);
  const plan = buildStockConsumePlan(options, products, quantityUnits, locations);
  const result = await client.consumeStockProduct(plan.product.id, plan.payload);

  return JSON.stringify({
    action: 'consumed',
    entity: 'stock',
    product: plan.product,
    payload: plan.payload,
    transaction_ids: extractTransactionIds(result),
    result,
  }, null, 2);
}

function buildStockConsumePlan(options, products, quantityUnits, locations) {
  const product = resolveProductOption({
    idValue: options['product-id'],
    nameValue: options.product ?? options.name,
    products,
  });
  const payload = {
    amount: parsePositiveNumber(options.amount, '--amount'),
    transaction_type: parseStockTransactionType(options['transaction-type'] || 'consume'),
  };

  validateStockUnitOption(options, product, quantityUnits, '--amount');

  if (options['stock-entry-id']) {
    payload.stock_entry_id = String(options['stock-entry-id']).trim();

    if (payload.amount !== 1) {
      throw new Error('--amount must be 1 when --stock-entry-id is used.');
    }
  }

  if (options['recipe-id'] != null && options['recipe-id'] !== '') {
    payload.recipe_id = parsePositiveInteger(options['recipe-id'], '--recipe-id');
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

  addBooleanOption(payload, options, 'spoiled');
  addBooleanOption(payload, options, 'exact-amount', 'exact_amount');
  addBooleanOption(payload, options, 'allow-subproduct-substitution', 'allow_subproduct_substitution');

  return {
    product: {
      id: Number(product.id),
      name: product.name || '',
      qu_id_stock: product.qu_id_stock == null ? null : Number(product.qu_id_stock),
    },
    payload,
  };
}

function addBooleanOption(payload, options, optionName, payloadName = optionName) {
  if (options[optionName] == null || options[optionName] === '') {
    return;
  }

  payload[payloadName] = parseBoolean(options[optionName], `--${optionName}`);
}

function parseBoolean(value, label) {
  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(`${label} must be true or false`);
}

module.exports = {
  buildStockConsumePlan,
  parseBoolean,
  runStockConsumeCommand,
};
