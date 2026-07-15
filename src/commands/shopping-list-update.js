'use strict';

const {
  convertToStockAmount,
  hasProductSelector,
  normalizeText,
  parseItemId,
  parseListId,
  parsePositiveNumber,
  resolveShoppingListProduct,
  resolveShoppingListUnit,
  summarizeItem,
} = require('./shopping-list-write');

async function runShoppingListUpdateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for shopping-list-update: ${format}`);
  }

  const itemId = parseItemId(options['item-id']);
  const [item, products, quantityUnits, quantityUnitConversions] = await Promise.all([
    client.getShoppingListItem(itemId),
    client.getProducts(),
    client.getQuantityUnits(),
    client.getQuantityUnitConversions(),
  ]);
  const plan = buildShoppingListUpdatePlan({
    options,
    item,
    products,
    quantityUnits,
    quantityUnitConversions,
  });
  const result = await client.updateShoppingListItem(itemId, plan.payload);

  return JSON.stringify({
    action: 'updated',
    entity: 'shopping_list',
    item: summarizeItem(item, products, quantityUnits),
    display_amount: plan.displayAmount,
    display_unit: plan.displayUnit,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildShoppingListUpdatePlan({
  options,
  item,
  products,
  quantityUnits,
  quantityUnitConversions,
}) {
  const updateFields = ['amount', 'unit', 'unit-id', 'note', 'list-id', 'product', 'product-id', 'name'];

  if (!updateFields.some((field) => Object.hasOwn(options, field))) {
    throw new Error('At least one shopping list field must be provided: --amount, --unit, --unit-id, --note, --list-id, --product, or --product-id.');
  }

  const changingProduct = hasProductSelector(options);
  const currentProduct = item.product_id == null
    ? null
    : products.find((candidate) => Number(candidate.id) === Number(item.product_id));
  const product = changingProduct
    ? resolveShoppingListProduct(options, products)
    : currentProduct;
  const payload = {};
  let displayAmount = null;
  let displayUnit = null;

  if (changingProduct) {
    if (!Object.hasOwn(options, 'amount')) {
      throw new Error('--amount is required when changing the shopping list item product.');
    }

    payload.product_id = Number(product.id);
  }

  if (Object.hasOwn(options, 'list-id')) {
    payload.shopping_list_id = parseListId(options['list-id']);
  }

  if (Object.hasOwn(options, 'note')) {
    payload.note = normalizeText(options.note);
  }

  const hasAmount = Object.hasOwn(options, 'amount');
  const hasUnit = Object.hasOwn(options, 'unit') || Object.hasOwn(options, 'unit-id');

  if ((hasAmount || hasUnit) && !product) {
    if (hasUnit) {
      throw new Error('--unit and --unit-id cannot be used for a note-only shopping list item.');
    }

    displayAmount = parsePositiveNumber(options.amount, '--amount');
    payload.amount = displayAmount;
  } else if (hasAmount || hasUnit || changingProduct) {
    const unit = resolveShoppingListUnit({
      options,
      product,
      quantityUnits,
      fallbackUnitId: changingProduct ? undefined : item.qu_id,
    });

    displayUnit = {
      id: Number(unit.id),
      name: unit.name || '',
    };
    payload.qu_id = Number(unit.id);

    if (hasAmount) {
      displayAmount = parsePositiveNumber(options.amount, '--amount');
      payload.amount = convertToStockAmount({
        amount: displayAmount,
        unit,
        product,
        quantityUnitConversions,
        quantityUnits,
      });
    }
  }

  return { payload, displayAmount, displayUnit };
}

module.exports = {
  buildShoppingListUpdatePlan,
  runShoppingListUpdateCommand,
};
