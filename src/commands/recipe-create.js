'use strict';

const {
  buildProductCreatePlan,
  findQuantityUnit,
  findQuantityUnitMatches,
  formatUnitChoices,
} = require('./product-create');

async function runRecipeCreateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for recipe-create: ${format}`);
  }

  const [products, quantityUnits, locations] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
    client.getLocations(),
  ]);
  const createMissingProducts = parseCreateMissingProductsOption(options['create-missing-products'], '--create-missing-products');
  const plan = buildRecipeCreatePlan(options, products, quantityUnits, locations, { createMissingProducts });
  const createdProducts = [];

  for (const ingredient of plan.ingredients) {
    if (!ingredient.productPlan) {
      continue;
    }

    const productResult = await client.createProduct(ingredient.productPlan.productPayload);
    const productId = productResult?.created_object_id;

    if (productId == null) {
      throw new Error(`Grocy did not return created_object_id for product: ${ingredient.name}`);
    }

    const conversionResults = [];

    for (const conversionPayload of ingredient.productPlan.conversionPayloads) {
      const payload = {
        ...conversionPayload,
        product_id: productId,
      };
      const result = await client.createQuantityUnitConversion(payload);

      conversionResults.push({ payload, result });
    }

    ingredient.productId = productId;
    createdProducts.push({
      name: ingredient.name,
      payload: ingredient.productPlan.productPayload,
      result: productResult,
      conversions: conversionResults,
    });
  }

  const recipeResult = await client.createRecipe(plan.recipePayload);
  const recipeId = recipeResult?.created_object_id;

  if (recipeId == null) {
    throw new Error('Grocy did not return created_object_id for recipe.');
  }

  const positions = [];

  for (const ingredient of plan.ingredients) {
    const payload = buildRecipePositionPayload(recipeId, ingredient);
    const result = await client.createRecipePosition(payload);

    positions.push({ payload, result });
  }

  return JSON.stringify({
    action: 'created',
    entity: 'recipes',
    payload: plan.recipePayload,
    result: recipeResult,
    createdProducts,
    positions,
  }, null, 2);
}

function buildRecipeCreatePlan(options, products, quantityUnits, locations = [], settings = {}) {
  const name = normalizeText(options.name);

  if (!name) {
    throw new Error('Missing required option: --name');
  }

  const ingredients = parseIngredientsOption(options.ingredients);

  if (ingredients.length === 0) {
    throw new Error('At least one recipe ingredient is required.');
  }

  const recipePayload = {
    name,
    type: 'normal',
  };
  const description = normalizeText(options.description);
  const baseServings = options['base-servings'];
  const desiredServings = options['desired-servings'];

  if (description) {
    recipePayload.description = description;
  }

  if (baseServings != null && baseServings !== '') {
    recipePayload.base_servings = parsePositiveInteger(baseServings, '--base-servings');
  }

  if (desiredServings != null && desiredServings !== '') {
    recipePayload.desired_servings = parsePositiveInteger(desiredServings, '--desired-servings');
  }

  return {
    recipePayload,
    ingredients: ingredients.map((ingredient, index) => {
      return buildIngredientPlan(ingredient, index, products, quantityUnits, locations, {
        createMissingProduct: Boolean(settings.createMissingProducts),
      });
    }),
  };
}

function buildIngredientPlan(ingredient, index, products, quantityUnits, locations = [], settings = {}) {
  if (!ingredient || typeof ingredient !== 'object' || Array.isArray(ingredient)) {
    throw new Error(`Ingredient #${index + 1} must be an object.`);
  }

  const productId = ingredient.productId ?? ingredient['product-id'];
  const name = normalizeText(ingredient.name ?? ingredient.productName ?? ingredient.product);

  if (productId == null && !name) {
    throw new Error(`Ingredient #${index + 1} requires name or productId.`);
  }

  const amount = parsePositiveNumber(ingredient.amount, `ingredient #${index + 1} amount`);
  const unitName = normalizeText(ingredient.unit ?? ingredient.quantityUnit ?? ingredient.qu);

  if (!unitName) {
    throw new Error(`Ingredient #${index + 1} requires unit.`);
  }

  const unitMatches = findQuantityUnitMatches(unitName, quantityUnits);
  const unit = findQuantityUnit(unitName, quantityUnits);

  if (!unit) {
    if (unitMatches.length > 1) {
      throw new Error(`Ambiguous ingredient unit: ${unitName}. Matches: ${formatUnitChoices(unitMatches)}`);
    }

    throw new Error(`Unknown ingredient unit: ${unitName}. Available units: ${formatUnitChoices(quantityUnits)}`);
  }

  const existingProduct = productId == null ? findProductByName(name, products) : undefined;
  const resolvedProductId = productId == null ? existingProduct?.id : parsePositiveInteger(productId, `ingredient #${index + 1} productId`);

  if (resolvedProductId == null && !settings.createMissingProduct) {
    throw new Error(formatMissingProductConfirmationError(name, index));
  }

  const productPlan = resolvedProductId == null
    ? buildMissingProductPlan(ingredient, name, unitName, quantityUnits, locations)
    : undefined;

  return {
    index,
    name,
    amount,
    unitId: Number(unit.id),
    productId: resolvedProductId == null ? undefined : Number(resolvedProductId),
    productPlan,
    note: normalizeText(ingredient.note),
    ingredientGroup: normalizeText(ingredient.ingredientGroup ?? ingredient['ingredient-group']),
    variableAmount: normalizeText(ingredient.variableAmount ?? ingredient['variable-amount']),
    onlyCheckSingleUnitInStock: parseBooleanFlag(ingredient.onlyCheckSingleUnitInStock ?? ingredient['only-check-single-unit-in-stock']),
    roundUp: parseBooleanFlag(ingredient.roundUp ?? ingredient['round-up']),
  };
}

function buildMissingProductPlan(ingredient, name, unitName, quantityUnits, locations = []) {
  const product = ingredient.product && typeof ingredient.product === 'object' && !Array.isArray(ingredient.product)
    ? ingredient.product
    : {};
  const productOptions = {
    name,
    description: product.description ?? ingredient.productDescription,
    location: product.location ?? ingredient.location,
    'location-id': product.locationId ?? product['location-id'] ?? ingredient.locationId,
    'stock-unit': product.stockUnit ?? product['stock-unit'] ?? ingredient.stockUnit ?? unitName,
    'purchase-unit': product.purchaseUnit ?? product['purchase-unit'] ?? ingredient.purchaseUnit,
    'purchase-to-stock-factor': product.purchaseToStockFactor ?? product['purchase-to-stock-factor'] ?? ingredient.purchaseToStockFactor,
    'consume-unit': product.consumeUnit ?? product['consume-unit'] ?? ingredient.consumeUnit ?? unitName,
    'consume-to-stock-factor': product.consumeToStockFactor ?? product['consume-to-stock-factor'] ?? ingredient.consumeToStockFactor,
  };

  return buildProductCreatePlan(productOptions, quantityUnits, locations);
}

function buildRecipePositionPayload(recipeId, ingredient) {
  const payload = {
    recipe_id: recipeId,
    product_id: ingredient.productId,
    amount: ingredient.amount,
    qu_id: ingredient.unitId,
  };

  if (ingredient.note) {
    payload.note = ingredient.note;
  }

  if (ingredient.ingredientGroup) {
    payload.ingredient_group = ingredient.ingredientGroup;
  }

  if (ingredient.variableAmount) {
    payload.variable_amount = ingredient.variableAmount;
  }

  if (ingredient.onlyCheckSingleUnitInStock !== undefined) {
    payload.only_check_single_unit_in_stock = ingredient.onlyCheckSingleUnitInStock;
  }

  if (ingredient.roundUp !== undefined) {
    payload.round_up = ingredient.roundUp;
  }

  return payload;
}

function parseIngredientsOption(value) {
  if (!value) {
    throw new Error('Missing required option: --ingredients');
  }

  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`--ingredients must be a JSON array: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('--ingredients must be a JSON array.');
  }

  return parsed;
}

function findProductByName(name, products) {
  const normalized = normalizeTerm(name);
  const matches = products.filter((product) => normalizeTerm(product.name) === normalized);

  if (matches.length > 1) {
    throw new Error(`Ambiguous product: ${name}. Matches: ${matches.map((product) => `${product.id}:${product.name}`).join(', ')}`);
  }

  return matches[0];
}

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

function parseBooleanFlag(value) {
  if (value == null || value === '') {
    return undefined;
  }

  if (value === true || value === 1 || value === '1' || value === 'true') {
    return 1;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return 0;
  }

  throw new Error(`Boolean flag must be true/false or 1/0, got: ${value}`);
}

function parseCreateMissingProductsOption(value, optionName) {
  if (value == null || value === '') {
    return false;
  }

  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  throw new Error(`${optionName} must be true/false or 1/0`);
}

function formatMissingProductConfirmationError(name, index) {
  return `Ingredient #${index + 1} product was not found: ${name}. Ask the user to confirm creating this new product, then rerun with --create-missing-products true.`;
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function normalizeTerm(value) {
  return normalizeText(value).toLowerCase().replaceAll('ё', 'е');
}

module.exports = {
  buildIngredientPlan,
  buildMissingProductPlan,
  buildRecipeCreatePlan,
  buildRecipePositionPayload,
  findProductByName,
  formatMissingProductConfirmationError,
  parseIngredientsOption,
  parseCreateMissingProductsOption,
  runRecipeCreateCommand,
};
