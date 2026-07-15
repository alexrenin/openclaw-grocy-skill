'use strict';

const { formatShoppingList } = require('../format-shopping-list');
const { findConversionFactor } = require('./shopping-list-write');

async function runShoppingListCommand({ client, format }) {
  const [products, quantityUnits, quantityUnitConversions, shoppingList] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getQuantityUnitConversions(),
    client.getShoppingList(),
  ]);

  const productsById = mapById(products);
  const quantityUnitsById = mapById(quantityUnits);
  const rows = normalizeShoppingListItems(
    shoppingList,
    productsById,
    quantityUnitsById,
    quantityUnitConversions,
  )
    .filter((item) => !isCompleted(item));

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  return formatShoppingList(rows);
}

function normalizeShoppingListItems(
  items,
  productsById,
  quantityUnitsById,
  quantityUnitConversions = [],
) {
  return items.map((item) => {
    const product = productsById.get(Number(item.product_id));
    const unitId = item.qu_id ?? (product ? product.qu_id_purchase || product.qu_id_stock : undefined);
    const unit = unitId == null ? undefined : quantityUnitsById.get(Number(unitId));
    const amount = normalizeDisplayAmount({
      item,
      product,
      unitId,
      quantityUnitConversions,
    });

    return {
      id: item.id,
      product_id: item.product_id,
      product_name: product?.name || (item.product_id == null ? '' : `Unknown product ${item.product_id}`),
      amount,
      unit_name: unit?.name || '',
      note: item.note || '',
      done: item.done,
    };
  });
}

function normalizeDisplayAmount({ item, product, unitId, quantityUnitConversions }) {
  const amount = Number(item.amount);

  if (!Number.isFinite(amount) || !product || unitId == null || product.qu_id_stock == null) {
    return item.amount;
  }

  const factor = findConversionFactor({
    fromUnitId: product.qu_id_stock,
    toUnitId: unitId,
    productId: product.id,
    quantityUnitConversions,
  });

  return factor == null ? item.amount : amount * factor;
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

function isCompleted(item) {
  return Number(item.done) === 1 || item.done === true;
}

module.exports = {
  runShoppingListCommand,
  normalizeShoppingListItems,
  normalizeDisplayAmount,
  mapById,
};
