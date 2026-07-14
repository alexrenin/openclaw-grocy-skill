'use strict';

const { findQuantityUnit } = require('./product-create');
const { findProductByName, parseIngredientAmount } = require('./recipe-create');
const { resolveRecipeOption } = require('./recipe-ingredient-add');

async function runRecipeIngredientUpdateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for recipe-ingredient-update: ${format}`);
  }

  const [recipes, products, quantityUnits, positions] = await Promise.all([
    client.getRecipes(),
    client.getProducts(),
    client.getQuantityUnits(),
    client.getRecipePositions(),
  ]);
  const plan = buildRecipeIngredientUpdatePlan(options, recipes, products, quantityUnits, positions);
  const result = await client.updateRecipePosition(plan.position.id, plan.payload);

  return JSON.stringify({
    action: 'updated',
    entity: 'recipes_pos',
    position: plan.position,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildRecipeIngredientUpdatePlan(options, recipes, products, quantityUnits, positions) {
  const position = resolveRecipePositionOption(options, recipes, products, positions);
  const payload = buildRecipePositionUpdatePayload(options, quantityUnits);

  return { position, payload };
}

function resolveRecipePositionOption(options, recipes, products, positions) {
  const positionId = options['position-id'];

  if (positionId) {
    const id = parsePositiveInteger(positionId, '--position-id');
    const position = positions.find((candidate) => Number(candidate.id) === id);

    if (!position) {
      throw new Error(`Unknown recipe ingredient position id: ${id}.`);
    }

    return normalizeRecipePosition(position);
  }

  const recipe = resolveRecipeOption({
    idValue: options['recipe-id'],
    nameValue: options.recipe,
    recipes,
  });
  const product = resolveProductOption({
    idValue: options['product-id'],
    nameValue: options.product ?? options.name,
    products,
  });
  const matches = positions.filter((position) => {
    return Number(position.recipe_id) === Number(recipe.id)
      && Number(position.product_id) === Number(product.id);
  });

  if (matches.length === 1) {
    return normalizeRecipePosition(matches[0], recipe, product);
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous recipe ingredient: recipe ${recipe.id}:${recipe.name}, product ${product.id}:${product.name}. Matching position ids: ${matches.map((position) => position.id).join(', ')}`);
  }

  throw new Error(`Recipe ingredient not found: recipe ${recipe.id}:${recipe.name}, product ${product.id}:${product.name}.`);
}

function resolveProductOption({ idValue, nameValue, products }) {
  if (idValue && nameValue) {
    throw new Error('Specify either --product-id or --product, not both.');
  }

  if (idValue) {
    const id = parsePositiveInteger(idValue, '--product-id');
    const product = products.find((candidate) => Number(candidate.id) === id);

    if (!product) {
      throw new Error(`Unknown product id: ${id}.`);
    }

    return {
      id,
      name: product.name,
    };
  }

  const name = normalizeText(nameValue);

  if (!name) {
    throw new Error('Missing required option: --product or --product-id');
  }

  const product = findProductByName(name, products);

  if (!product) {
    throw new Error(`Unknown product: ${name}.`);
  }

  return {
    id: Number(product.id),
    name: product.name,
  };
}

function buildRecipePositionUpdatePayload(options, quantityUnits) {
  const payload = {};

  if (options.amount != null && options.amount !== '') {
    payload.amount = parseIngredientAmount(options.amount, '--amount');
  }

  if (options.unit != null && options.unit !== '') {
    const unit = findQuantityUnit(options.unit, quantityUnits);

    if (!unit) {
      throw new Error(`Unknown ingredient unit: ${options.unit}.`);
    }

    payload.qu_id = Number(unit.id);
  }

  copyOptionalText(options, payload, 'note', 'note');
  copyOptionalText(options, payload, 'ingredient-group', 'ingredient_group');
  copyOptionalText(options, payload, 'variable-amount', 'variable_amount');
  copyOptionalBoolean(options, payload, 'only-check-single-unit-in-stock', 'only_check_single_unit_in_stock');
  copyOptionalBoolean(options, payload, 'round-up', 'round_up');

  if (Object.keys(payload).length === 0) {
    throw new Error('Nothing to update. Provide --amount, --unit, --note, --ingredient-group, --variable-amount, --only-check-single-unit-in-stock, or --round-up.');
  }

  return payload;
}

function copyOptionalText(options, payload, optionName, payloadName) {
  if (options[optionName] == null) {
    return;
  }

  payload[payloadName] = normalizeText(options[optionName]);
}

function copyOptionalBoolean(options, payload, optionName, payloadName) {
  if (options[optionName] == null || options[optionName] === '') {
    return;
  }

  payload[payloadName] = parseBooleanFlag(options[optionName]);
}

function normalizeRecipePosition(position, recipe, product) {
  return {
    id: Number(position.id),
    recipeId: Number(position.recipe_id),
    recipeName: recipe?.name,
    productId: Number(position.product_id),
    productName: product?.name,
  };
}

function parsePositiveInteger(value, label) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return numberValue;
}

function parseBooleanFlag(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return 1;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return 0;
  }

  throw new Error(`Boolean flag must be true/false or 1/0, got: ${value}`);
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

module.exports = {
  buildRecipeIngredientUpdatePlan,
  buildRecipePositionUpdatePayload,
  resolveProductOption,
  resolveRecipePositionOption,
  runRecipeIngredientUpdateCommand,
};
