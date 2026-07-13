'use strict';

function formatShoppingList(items, options = {}) {
  const activeItems = items.filter((item) => !isCompleted(item));

  if (activeItems.length === 0) {
    return 'Список покупок пуст.';
  }

  const lines = activeItems.map((item) => formatShoppingListItem(item, options));

  return ['Список покупок:', '', ...lines].join('\n');
}

function formatShoppingListItem(item, options) {
  const name = getProductName(item, options);
  const amount = formatAmount(getFirstPresent(item.amount, item.amount_required));
  const unit = getUnitName(item, options);
  const note = normalizeText(getFirstPresent(item.note, item.userfields?.note));
  const quantity = [amount, unit].filter(Boolean).join(' ');
  const suffix = [quantity, note].filter(Boolean).join(' — ');

  if (!suffix) {
    return `• ${name}`;
  }

  return `• ${name} — ${suffix}`;
}

function getProductName(item, options) {
  const productId = getFirstPresent(item.product_id, item.product?.id);
  const product = productId == null ? undefined : options.productsById?.[productId];
  const name = getFirstPresent(
    item.product_name,
    item.product?.name,
    product?.name,
    item.name,
  );

  return normalizeText(name) || `Product ${productId ?? 'unknown'}`;
}

function getUnitName(item, options) {
  const unitId = getFirstPresent(
    item.qu_id,
    item.quantity_unit_id,
    item.product?.qu_id_purchase,
    item.product?.qu_id_stock,
  );
  const unit = unitId == null ? undefined : options.quantityUnitsById?.[unitId];

  return normalizeText(getFirstPresent(
    item.unit_name,
    item.quantity_unit_name,
    item.quantity_unit?.name,
    unit?.name,
  ));
}

function isCompleted(item) {
  return Boolean(getFirstPresent(item.done, item.completed, item.is_done));
}

function formatAmount(value) {
  if (value == null || value === '') {
    return '';
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return normalizeText(value);
  }

  return Number.isInteger(numberValue) ? String(numberValue) : String(numberValue);
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function getFirstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

module.exports = {
  formatShoppingList,
  formatShoppingListItem,
};
