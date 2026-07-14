'use strict';

const {
  formatLocationChoices,
  formatMissingFactorError,
  formatUnitChoices,
  normalizeText,
  parsePositiveInteger,
  parsePositiveNumber,
  resolveLocationOption,
  resolveUnitOption,
} = require('./product-create');
const { findProductByName } = require('./recipe-create');
const { formatProductChoices } = require('./stock-add');

async function runProductUpdateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for product-update: ${format}`);
  }

  const [
    products,
    quantityUnits,
    locations,
    quantityUnitConversions,
  ] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getLocations(),
    client.getObjects('quantity_unit_conversions'),
  ]);

  const plan = buildProductUpdatePlan({
    options,
    products,
    quantityUnits,
    locations,
    quantityUnitConversions,
  });
  const conversionResults = [];

  for (const operation of plan.conversionOperations) {
    if (operation.action === 'update') {
      const result = await client.updateQuantityUnitConversion(operation.id, operation.payload);
      conversionResults.push({ ...operation, result });
      continue;
    }

    const result = await client.createQuantityUnitConversion(operation.payload);
    conversionResults.push({ ...operation, result });
  }

  const result = await client.updateProduct(plan.product.id, plan.productPayload);

  return JSON.stringify({
    action: 'updated',
    entity: 'products',
    product: plan.product,
    payload: plan.productPayload,
    conversions: conversionResults,
    result,
  }, null, 2);
}

function buildProductUpdatePlan({
  options,
  products,
  quantityUnits,
  locations,
  quantityUnitConversions = [],
}) {
  const product = resolveProductOption({
    idValue: options['product-id'],
    nameValue: options.product,
    products,
  });
  const payload = { ...product };
  const changedFields = new Set();

  if (Object.hasOwn(options, 'name')) {
    const name = normalizeText(options.name);

    if (!name) {
      throw new Error('--name must not be empty');
    }

    payload.name = name;
    changedFields.add('name');
  }

  if (Object.hasOwn(options, 'description')) {
    payload.description = normalizeText(options.description);
    changedFields.add('description');
  }

  if (Object.hasOwn(options, 'active')) {
    payload.active = parseBooleanInt(options.active, '--active');
    changedFields.add('active');
  }

  if (hasLocationOption(options)) {
    payload.location_id = resolveLocationOption({
      idValue: options['location-id'],
      nameValue: options.location,
      locations,
      required: true,
    });
    changedFields.add('location_id');
  }

  if (hasUnitOption(options, 'stock')) {
    payload.qu_id_stock = resolveUnitOption({
      label: 'stock unit',
      idValue: options['stock-unit-id'],
      nameValue: options['stock-unit'],
      quantityUnits,
      required: true,
    });
    changedFields.add('qu_id_stock');
  }

  if (hasUnitOption(options, 'purchase')) {
    payload.qu_id_purchase = resolveUnitOption({
      label: 'purchase unit',
      idValue: options['purchase-unit-id'],
      nameValue: options['purchase-unit'],
      quantityUnits,
      required: true,
    });
    changedFields.add('qu_id_purchase');
  } else if (payload.qu_id_purchase == null || payload.qu_id_purchase === '') {
    payload.qu_id_purchase = payload.qu_id_stock;
  }

  if (hasUnitOption(options, 'consume')) {
    payload.qu_id_consume = resolveUnitOption({
      label: 'consume unit',
      idValue: options['consume-unit-id'],
      nameValue: options['consume-unit'],
      quantityUnits,
      required: true,
    });
    changedFields.add('qu_id_consume');
  } else if (payload.qu_id_consume == null || payload.qu_id_consume === '') {
    payload.qu_id_consume = payload.qu_id_stock;
  }

  const conversionOperations = buildConversionOperations({
    productId: Number(product.id),
    quIdStock: Number(payload.qu_id_stock),
    quIdPurchase: Number(payload.qu_id_purchase),
    quIdConsume: Number(payload.qu_id_consume),
    purchaseFactorValue: options['purchase-to-stock-factor'],
    consumeFactorValue: options['consume-to-stock-factor'],
    quantityUnitConversions,
    purchaseUnitChanged: changedFields.has('qu_id_purchase') || changedFields.has('qu_id_stock'),
    consumeUnitChanged: changedFields.has('qu_id_consume') || changedFields.has('qu_id_stock'),
  });

  if (conversionOperations.length > 0) {
    changedFields.add('quantity_unit_conversions');
  }

  if (changedFields.size === 0) {
    throw new Error('At least one product field or conversion factor must be provided.');
  }

  return {
    product: {
      id: Number(product.id),
      name: product.name || '',
    },
    productPayload: payload,
    conversionOperations,
  };
}

function buildConversionOperations({
  productId,
  quIdStock,
  quIdPurchase,
  quIdConsume,
  purchaseFactorValue,
  consumeFactorValue,
  quantityUnitConversions,
  purchaseUnitChanged,
  consumeUnitChanged,
}) {
  const operations = [];

  appendConversionOperation({
    operations,
    productId,
    sourceUnitId: quIdPurchase,
    stockUnitId: quIdStock,
    factorValue: purchaseFactorValue,
    optionName: '--purchase-to-stock-factor',
    quantityUnitConversions,
    unitChanged: purchaseUnitChanged,
  });

  if (quIdConsume !== quIdPurchase) {
    appendConversionOperation({
      operations,
      productId,
      sourceUnitId: quIdConsume,
      stockUnitId: quIdStock,
      factorValue: consumeFactorValue,
      optionName: '--consume-to-stock-factor',
      quantityUnitConversions,
      unitChanged: consumeUnitChanged,
    });
  }

  return operations;
}

function appendConversionOperation({
  operations,
  productId,
  sourceUnitId,
  stockUnitId,
  factorValue,
  optionName,
  quantityUnitConversions,
  unitChanged,
}) {
  if (sourceUnitId === stockUnitId) {
    return;
  }

  const existing = findProductConversion({
    quantityUnitConversions,
    productId,
    sourceUnitId,
    stockUnitId,
  });

  if (factorValue == null || factorValue === '') {
    if (unitChanged && !existing) {
      throw new Error(formatMissingFactorError(optionName));
    }

    return;
  }

  const payload = {
    from_qu_id: sourceUnitId,
    to_qu_id: stockUnitId,
    factor: parsePositiveNumber(factorValue, optionName),
    product_id: productId,
  };

  if (existing) {
    operations.push({
      action: 'update',
      id: Number(existing.id),
      payload,
    });
    return;
  }

  operations.push({
    action: 'create',
    payload,
  });
}

function findProductConversion({
  quantityUnitConversions,
  productId,
  sourceUnitId,
  stockUnitId,
}) {
  return (quantityUnitConversions || []).find((conversion) => {
    return Number(conversion.product_id) === Number(productId)
      && Number(conversion.from_qu_id) === Number(sourceUnitId)
      && Number(conversion.to_qu_id) === Number(stockUnitId);
  });
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

function hasLocationOption(options) {
  return Object.hasOwn(options, 'location') || Object.hasOwn(options, 'location-id');
}

function hasUnitOption(options, prefix) {
  return Object.hasOwn(options, `${prefix}-unit`) || Object.hasOwn(options, `${prefix}-unit-id`);
}

function parseBooleanInt(value, label) {
  const normalized = normalizeText(value).toLowerCase();

  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return 1;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return 0;
  }

  throw new Error(`${label} must be true or false`);
}

module.exports = {
  buildConversionOperations,
  buildProductUpdatePlan,
  findProductConversion,
  formatLocationChoices,
  formatUnitChoices,
  parseBooleanInt,
  resolveProductOption,
  runProductUpdateCommand,
};
