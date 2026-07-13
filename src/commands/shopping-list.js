'use strict';

const { formatShoppingList } = require('../format-shopping-list');

async function runShoppingListCommand({ client, format }) {
  const [products, quantityUnits, shoppingList] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getShoppingList(),
  ]);

  const productsById = mapById(products);
  const quantityUnitsById = mapById(quantityUnits);
  const rows = normalizeShoppingListItems(shoppingList, productsById, quantityUnitsById)
    .filter((item) => !isCompleted(item));

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  return formatShoppingList(rows);
}

function normalizeShoppingListItems(items, productsById, quantityUnitsById) {
  return items.map((item) => {
    const product = productsById.get(Number(item.product_id));
    const unitId = product ? product.qu_id_purchase || product.qu_id_stock : undefined;
    const unit = unitId == null ? undefined : quantityUnitsById.get(Number(unitId));

    return {
      id: item.id,
      product_id: item.product_id,
      product_name: product?.name || `Unknown product ${item.product_id}`,
      amount: item.amount,
      unit_name: unit?.name || '',
      note: item.note || '',
      done: item.done,
    };
  });
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
  mapById,
};
