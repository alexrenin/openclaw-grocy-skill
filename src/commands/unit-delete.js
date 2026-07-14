'use strict';

const {
  normalizeText,
  parsePositiveInteger,
} = require('./product-create');

async function runUnitDeleteCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for unit-delete: ${format}`);
  }

  const unitId = parseUnitId(options['unit-id']);
  const [
    unit,
    products,
    recipePositions,
    shoppingList,
    quantityUnitConversions,
  ] = await Promise.all([
    client.getObject('quantity_units', unitId),
    client.getProducts(),
    client.getRecipePositions(),
    client.getShoppingList(),
    client.getObjects('quantity_unit_conversions'),
  ]);
  const plan = buildUnitDeletePlan({
    unitId,
    unit,
    products,
    recipePositions,
    shoppingList,
    quantityUnitConversions,
    confirmUnitName: options['confirm-unit-name'],
  });
  const result = await client.deleteQuantityUnit(unitId);

  return JSON.stringify({
    action: 'deleted',
    entity: 'quantity_units',
    unit: plan.unit,
    checks: plan.checks,
    result,
  }, null, 2);
}

function buildUnitDeletePlan({
  unitId,
  unit,
  products = [],
  recipePositions = [],
  shoppingList = [],
  quantityUnitConversions = [],
  confirmUnitName,
}) {
  const normalizedConfirmName = normalizeText(confirmUnitName);
  const unitName = normalizeText(unit?.name);

  if (normalizedConfirmName && normalizedConfirmName !== unitName) {
    throw new Error(`--confirm-unit-name does not match quantity unit ${unitId}:${unitName || 'unnamed'}`);
  }

  const blockers = findUnitDeleteBlockers({
    unitId,
    products,
    recipePositions,
    shoppingList,
    quantityUnitConversions,
  });

  if (blockers.length > 0) {
    throw new Error([
      `Refusing to delete quantity unit ${unitId}:${unitName || 'unnamed'} because it is still in use.`,
      `Blockers: ${blockers.join('; ')}.`,
      'Fallback: update dependent products, recipe ingredients, shopping list rows, or conversion rows first; otherwise leave the unit in Grocy.',
    ].join(' '));
  }

  return {
    unit: {
      id: unitId,
      name: unitName,
      name_plural: normalizeText(unit?.name_plural),
    },
    checks: {
      products: 'none',
      recipe_positions: 'none',
      shopping_list: 'none',
      quantity_unit_conversions: 'none',
    },
  };
}

function findUnitDeleteBlockers({
  unitId,
  products,
  recipePositions,
  shoppingList,
  quantityUnitConversions,
}) {
  const blockers = [];
  const productIds = (products || [])
    .filter((product) => {
      return Number(product.qu_id_stock) === Number(unitId)
        || Number(product.qu_id_purchase) === Number(unitId)
        || Number(product.qu_id_consume) === Number(unitId);
    })
    .map((product) => product.id)
    .filter((id) => id != null);

  if (productIds.length > 0) {
    blockers.push(`used by products ${productIds.join(', ')}`);
  }

  const recipePositionIds = (recipePositions || [])
    .filter((position) => Number(position.qu_id) === Number(unitId))
    .map((position) => position.id)
    .filter((id) => id != null);

  if (recipePositionIds.length > 0) {
    blockers.push(`used by recipe ingredient rows ${recipePositionIds.join(', ')}`);
  }

  const shoppingItemIds = (shoppingList || [])
    .filter((item) => Number(item.qu_id) === Number(unitId))
    .map((item) => item.id)
    .filter((id) => id != null);

  if (shoppingItemIds.length > 0) {
    blockers.push(`used by shopping list rows ${shoppingItemIds.join(', ')}`);
  }

  const conversionIds = (quantityUnitConversions || [])
    .filter((conversion) => {
      return Number(conversion.from_qu_id) === Number(unitId)
        || Number(conversion.to_qu_id) === Number(unitId);
    })
    .map((conversion) => conversion.id)
    .filter((id) => id != null);

  if (conversionIds.length > 0) {
    blockers.push(`used by quantity unit conversion rows ${conversionIds.join(', ')}`);
  }

  return blockers;
}

function parseUnitId(value) {
  return parsePositiveInteger(value, '--unit-id');
}

module.exports = {
  buildUnitDeletePlan,
  findUnitDeleteBlockers,
  parseUnitId,
  runUnitDeleteCommand,
};
