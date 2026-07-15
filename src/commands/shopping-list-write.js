'use strict';

const {
  findQuantityUnit,
  findQuantityUnitMatches,
  formatUnitChoices,
} = require('./product-create');
const {
  formatProductChoices,
} = require('./stock-add');
const {
  resolveProductOption,
} = require('./product-update');

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

function parseListId(value) {
  if (value == null || value === '') {
    return 1;
  }

  return parsePositiveInteger(value, '--list-id');
}

function parseItemId(value) {
  return parsePositiveInteger(value, '--item-id');
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function hasProductSelector(options) {
  return Boolean(options.product || options['product-id'] || options.name);
}

function resolveShoppingListProduct(options, products) {
  const nameValue = options.product ?? options.name;

  try {
    return resolveProductOption({
      idValue: options['product-id'],
      nameValue,
      products,
    });
  } catch (error) {
    if (/^Unknown product/.test(error.message)) {
      throw new Error(`${error.message} Use product-search before changing the shopping list when matching is unclear.`);
    }

    throw error;
  }
}

function resolveShoppingListUnit({
  options,
  product,
  quantityUnits,
  fallbackUnitId,
}) {
  const unitName = normalizeText(options.unit);
  const unitIdValue = options['unit-id'];

  if (unitName && unitIdValue) {
    throw new Error('Specify either --unit or --unit-id, not both.');
  }

  if (unitIdValue != null && unitIdValue !== '') {
    const unitId = parsePositiveInteger(unitIdValue, '--unit-id');
    const unit = quantityUnits.find((candidate) => Number(candidate.id) === unitId);

    if (!unit) {
      throw new Error(`Unknown quantity unit id: ${unitId}. Available units: ${formatUnitChoices(quantityUnits)}`);
    }

    return unit;
  }

  if (unitName) {
    const matches = findQuantityUnitMatches(unitName, quantityUnits);
    const unit = findQuantityUnit(unitName, quantityUnits);

    if (!unit) {
      if (matches.length > 1) {
        throw new Error(`Ambiguous quantity unit: ${unitName}. Matches: ${formatUnitChoices(matches)}`);
      }

      throw new Error(`Unknown quantity unit: ${unitName}. Available units: ${formatUnitChoices(quantityUnits)}`);
    }

    return unit;
  }

  const defaultUnitId = fallbackUnitId
    ?? product.qu_id_purchase
    ?? product.qu_id_stock;
  const defaultUnit = quantityUnits.find((candidate) => Number(candidate.id) === Number(defaultUnitId));

  if (!defaultUnit) {
    throw new Error(`Product ${product.id}:${product.name || 'unnamed'} has no resolvable default shopping unit. Available units: ${formatUnitChoices(quantityUnits)}`);
  }

  return defaultUnit;
}

function findConversionFactor({
  fromUnitId,
  toUnitId,
  productId,
  quantityUnitConversions = [],
}) {
  const fromId = Number(fromUnitId);
  const toId = Number(toUnitId);

  if (fromId === toId) {
    return 1;
  }

  const direct = findBestConversion({
    fromUnitId: fromId,
    toUnitId: toId,
    productId,
    quantityUnitConversions,
  });

  if (direct) {
    return Number(direct.factor);
  }

  const reverse = findBestConversion({
    fromUnitId: toId,
    toUnitId: fromId,
    productId,
    quantityUnitConversions,
  });
  const reverseFactor = Number(reverse?.factor);

  if (Number.isFinite(reverseFactor) && reverseFactor > 0) {
    return 1 / reverseFactor;
  }

  return null;
}

function findBestConversion({
  fromUnitId,
  toUnitId,
  productId,
  quantityUnitConversions,
}) {
  const matches = (quantityUnitConversions || []).filter((conversion) => {
    const factor = Number(conversion.factor);
    return Number(conversion.from_qu_id) === Number(fromUnitId)
      && Number(conversion.to_qu_id) === Number(toUnitId)
      && Number.isFinite(factor)
      && factor > 0;
  });
  const productSpecific = matches.find((conversion) => Number(conversion.product_id) === Number(productId));

  return productSpecific || matches.find((conversion) => {
    return conversion.product_id == null || Number(conversion.product_id) === 0;
  }) || null;
}

function convertToStockAmount({
  amount,
  unit,
  product,
  quantityUnitConversions,
  quantityUnits,
}) {
  const stockUnitId = Number(product.qu_id_stock);

  if (!Number.isInteger(stockUnitId) || stockUnitId <= 0) {
    throw new Error(`Product ${product.id}:${product.name || 'unnamed'} has no valid stock unit.`);
  }

  const factor = findConversionFactor({
    fromUnitId: unit.id,
    toUnitId: stockUnitId,
    productId: product.id,
    quantityUnitConversions,
  });

  if (factor == null) {
    const stockUnit = quantityUnits.find((candidate) => Number(candidate.id) === stockUnitId);
    throw new Error([
      `No quantity unit conversion is configured for product ${product.id}:${product.name || 'unnamed'}`,
      `from ${unit.id}:${unit.name || 'unnamed'} to ${stockUnitId}:${stockUnit?.name || 'unnamed'}.`,
      'Use the product stock unit or configure the product conversion first.',
    ].join(' '));
  }

  return amount * factor;
}

function summarizeItem(item, products = [], quantityUnits = []) {
  const product = products.find((candidate) => Number(candidate.id) === Number(item.product_id));
  const unit = quantityUnits.find((candidate) => Number(candidate.id) === Number(item.qu_id));

  return {
    id: Number(item.id),
    shopping_list_id: Number(item.shopping_list_id ?? 1),
    product_id: item.product_id == null ? null : Number(item.product_id),
    product_name: product?.name || '',
    amount: Number(item.amount ?? 0),
    qu_id: item.qu_id == null ? null : Number(item.qu_id),
    unit_name: unit?.name || '',
    note: item.note || '',
    done: Number(item.done ?? 0),
  };
}

function formatAvailableProducts(products) {
  return formatProductChoices(products);
}

module.exports = {
  convertToStockAmount,
  findConversionFactor,
  formatAvailableProducts,
  hasProductSelector,
  normalizeText,
  parseItemId,
  parseListId,
  parsePositiveNumber,
  resolveShoppingListProduct,
  resolveShoppingListUnit,
  summarizeItem,
};
