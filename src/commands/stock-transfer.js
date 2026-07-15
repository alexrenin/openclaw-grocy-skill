'use strict';

const { resolveLocationOption } = require('./product-create');
const {
  extractTransactionIds,
  parsePositiveNumber,
  resolveProductOption,
} = require('./stock-add');
const { validateStockUnitOption } = require('./stock-inventory');

async function runStockTransferCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for stock-transfer: ${format}`);
  }

  const [products, quantityUnits, locations] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getLocations(),
  ]);
  const plan = buildStockTransferPlan(options, products, quantityUnits, locations);
  const result = await client.transferStockProduct(plan.product.id, plan.payload);

  return JSON.stringify({
    action: 'transferred',
    entity: 'stock',
    product: plan.product,
    payload: plan.payload,
    transaction_ids: extractTransactionIds(result),
    result,
  }, null, 2);
}

function buildStockTransferPlan(options, products, quantityUnits, locations) {
  const product = resolveProductOption({
    idValue: options['product-id'],
    nameValue: options.product ?? options.name,
    products,
  });
  const payload = {
    amount: parsePositiveNumber(options.amount, '--amount'),
    location_id_from: resolveLocationOption({
      idValue: options['from-location-id'],
      nameValue: options['from-location'],
      locations,
      required: true,
    }),
    location_id_to: resolveLocationOption({
      idValue: options['to-location-id'],
      nameValue: options['to-location'],
      locations,
      required: true,
    }),
  };

  validateStockUnitOption(options, product, quantityUnits, '--amount');

  if (Number(payload.location_id_from) === Number(payload.location_id_to)) {
    throw new Error('Transfer source and target locations must be different.');
  }

  if (options['stock-entry-id']) {
    payload.stock_entry_id = String(options['stock-entry-id']).trim();

    if (payload.amount !== 1) {
      throw new Error('--amount must be 1 when --stock-entry-id is used.');
    }
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

module.exports = {
  buildStockTransferPlan,
  runStockTransferCommand,
};
