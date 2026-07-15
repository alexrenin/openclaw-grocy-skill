'use strict';

const {
  convertToStockAmount,
  hasProductSelector,
  normalizeText,
  parseListId,
  parsePositiveNumber,
  resolveShoppingListProduct,
  resolveShoppingListUnit,
  summarizeItem,
} = require('./shopping-list-write');

async function runShoppingListAddCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for shopping-list-add: ${format}`);
  }

  const [products, quantityUnits, quantityUnitConversions, shoppingList] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getQuantityUnitConversions(),
    client.getShoppingList(),
  ]);
  const plan = buildShoppingListAddPlan({
    options,
    products,
    quantityUnits,
    quantityUnitConversions,
    shoppingList,
  });
  const result = plan.existingItem
    ? await client.updateShoppingListItem(plan.existingItem.id, plan.payload)
    : await client.createShoppingListItem(plan.payload);

  return JSON.stringify({
    action: 'added',
    entity: 'shopping_list',
    operation: plan.existingItem ? 'updated_existing_item' : 'created_item',
    item: plan.existingItem
      ? summarizeItem(plan.existingItem, products, quantityUnits)
      : null,
    display_amount: plan.displayAmount,
    display_unit: plan.displayUnit,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildShoppingListAddPlan({
  options,
  products,
  quantityUnits,
  quantityUnitConversions,
  shoppingList,
}) {
  const listId = parseListId(options['list-id']);
  const note = normalizeText(options.note);
  const amount = options.amount == null || options.amount === ''
    ? 1
    : parsePositiveNumber(options.amount, '--amount');

  if (!hasProductSelector(options)) {
    if (!note) {
      throw new Error('Missing required option: --product, --product-id, or --note');
    }

    if (options.unit || options['unit-id']) {
      throw new Error('--unit and --unit-id require a product selector.');
    }

    return {
      existingItem: null,
      displayAmount: amount,
      displayUnit: null,
      payload: {
        shopping_list_id: listId,
        product_id: null,
        amount,
        note,
        done: 0,
      },
    };
  }

  const product = resolveShoppingListProduct(options, products);
  const unit = resolveShoppingListUnit({ options, product, quantityUnits });
  const stockAmount = convertToStockAmount({
    amount,
    unit,
    product,
    quantityUnitConversions,
    quantityUnits,
  });
  const existingItem = (shoppingList || []).find((item) => {
    return Number(item.product_id) === Number(product.id)
      && Number(item.shopping_list_id ?? 1) === listId;
  }) || null;
  const payload = {
    product_id: Number(product.id),
    shopping_list_id: listId,
    amount: stockAmount,
    qu_id: Number(unit.id),
    note,
    done: 0,
  };

  if (existingItem) {
    payload.amount = Number(existingItem.amount ?? 0) + stockAmount;
    payload.note = Object.hasOwn(options, 'note') ? note : (existingItem.note || '');
  }

  return {
    existingItem,
    displayAmount: amount,
    displayUnit: {
      id: Number(unit.id),
      name: unit.name || '',
    },
    payload,
  };
}

module.exports = {
  buildShoppingListAddPlan,
  runShoppingListAddCommand,
};
