'use strict';

const {
  normalizeText,
  parsePositiveInteger,
} = require('./product-create');

async function runProductDeleteCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for product-delete: ${format}`);
  }

  const productId = parseProductId(options['product-id']);
  const [
    product,
    stock,
    recipePositions,
    shoppingList,
  ] = await Promise.all([
    client.getObject('products', productId),
    client.getStock(),
    client.getRecipePositions(),
    client.getShoppingList(),
  ]);
  const plan = buildProductDeletePlan({
    productId,
    product,
    stock,
    recipePositions,
    shoppingList,
    confirmProductName: options['confirm-product-name'],
  });
  const result = await client.deleteProduct(productId);

  return JSON.stringify({
    action: 'deleted',
    entity: 'products',
    product: plan.product,
    checks: plan.checks,
    result,
  }, null, 2);
}

function buildProductDeletePlan({
  productId,
  product,
  stock = [],
  recipePositions = [],
  shoppingList = [],
  confirmProductName,
}) {
  const normalizedConfirmName = normalizeText(confirmProductName);
  const productName = normalizeText(product?.name);

  if (normalizedConfirmName && normalizedConfirmName !== productName) {
    throw new Error(`--confirm-product-name does not match product ${productId}:${productName || 'unnamed'}`);
  }

  const blockers = findProductDeleteBlockers({
    productId,
    stock,
    recipePositions,
    shoppingList,
  });

  if (blockers.length > 0) {
    throw new Error([
      `Refusing to delete product ${productId}:${productName || 'unnamed'} because it is still in use.`,
      `Blockers: ${blockers.join('; ')}.`,
      'Fallback: ask for confirmation to deactivate it with product-update --product-id <id> --active false --format json.',
    ].join(' '));
  }

  return {
    product: {
      id: productId,
      name: productName,
    },
    checks: {
      stock: 'zero',
      recipe_positions: 'none',
      shopping_list: 'none',
    },
  };
}

function findProductDeleteBlockers({
  productId,
  stock,
  recipePositions,
  shoppingList,
}) {
  const blockers = [];
  const stockItem = (stock || []).find((item) => Number(item.product_id) === Number(productId));
  const stockAmount = Number(stockItem?.amount ?? 0);

  if (Number.isFinite(stockAmount) && stockAmount !== 0) {
    blockers.push(`stock amount is ${stockItem.amount}`);
  }

  const recipePositionIds = (recipePositions || [])
    .filter((position) => Number(position.product_id) === Number(productId))
    .map((position) => position.id)
    .filter((id) => id != null);

  if (recipePositionIds.length > 0) {
    blockers.push(`used by recipe ingredient rows ${recipePositionIds.join(', ')}`);
  }

  const shoppingItemIds = (shoppingList || [])
    .filter((item) => Number(item.product_id) === Number(productId))
    .map((item) => item.id)
    .filter((id) => id != null);

  if (shoppingItemIds.length > 0) {
    blockers.push(`used by shopping list rows ${shoppingItemIds.join(', ')}`);
  }

  return blockers;
}

function parseProductId(value) {
  return parsePositiveInteger(value, '--product-id');
}

module.exports = {
  buildProductDeletePlan,
  findProductDeleteBlockers,
  parseProductId,
  runProductDeleteCommand,
};
