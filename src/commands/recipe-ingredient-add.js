'use strict';

const {
  buildIngredientPlan,
  buildRecipePositionPayload,
  parseCreateMissingProductsOption,
} = require('./recipe-create');

async function runRecipeIngredientAddCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for recipe-ingredient-add: ${format}`);
  }

  const [recipes, products, quantityUnits, locations] = await Promise.all([
    client.getRecipes(),
    client.getProducts(),
    client.getQuantityUnits(),
    client.getLocations(),
  ]);
  const createMissingProducts = parseCreateMissingProductsOption(options['create-missing-products'], '--create-missing-products');
  const plan = buildRecipeIngredientAddPlan(options, recipes, products, quantityUnits, locations, { createMissingProducts });
  let createdProduct;

  if (plan.ingredient.productPlan) {
    const productResult = await client.createProduct(plan.ingredient.productPlan.productPayload);
    const productId = productResult?.created_object_id;

    if (productId == null) {
      throw new Error(`Grocy did not return created_object_id for product: ${plan.ingredient.name}`);
    }

    const conversionResults = [];

    for (const conversionPayload of plan.ingredient.productPlan.conversionPayloads) {
      const payload = {
        ...conversionPayload,
        product_id: productId,
      };
      const result = await client.createQuantityUnitConversion(payload);

      conversionResults.push({ payload, result });
    }

    plan.ingredient.productId = productId;
    createdProduct = {
      name: plan.ingredient.name,
      payload: plan.ingredient.productPlan.productPayload,
      result: productResult,
      conversions: conversionResults,
    };
  }

  const payload = buildRecipePositionPayload(plan.recipe.id, plan.ingredient);
  const result = await client.createRecipePosition(payload);

  return JSON.stringify({
    action: 'added',
    entity: 'recipes_pos',
    recipe: plan.recipe,
    payload,
    result,
    createdProduct,
  }, null, 2);
}

function buildRecipeIngredientAddPlan(options, recipes, products, quantityUnits, locations = [], settings = {}) {
  const recipe = resolveRecipeOption({
    idValue: options['recipe-id'],
    nameValue: options.recipe,
    recipes,
  });
  const ingredientInput = buildIngredientInput(options);
  const ingredient = buildIngredientPlan(ingredientInput, 0, products, quantityUnits, locations, {
    createMissingProduct: Boolean(settings.createMissingProducts),
  });

  return { recipe, ingredient };
}

function buildIngredientInput(options) {
  const productName = options.product ?? options.name;
  const productId = options['product-id'];

  if (productId && productName) {
    throw new Error('Specify either --product-id or --product, not both.');
  }

  return {
    name: productName,
    productId,
    amount: options.amount,
    unit: options.unit,
    note: options.note,
    ingredientGroup: options['ingredient-group'],
    variableAmount: options['variable-amount'],
    onlyCheckSingleUnitInStock: options['only-check-single-unit-in-stock'],
    roundUp: options['round-up'],
    product: {
      description: options['product-description'],
      location: options.location,
      locationId: options['location-id'],
      stockUnit: options['stock-unit'],
      purchaseUnit: options['purchase-unit'],
      purchaseToStockFactor: options['purchase-to-stock-factor'],
      consumeUnit: options['consume-unit'],
      consumeToStockFactor: options['consume-to-stock-factor'],
    },
  };
}

function resolveRecipeOption({ idValue, nameValue, recipes }) {
  if (idValue && nameValue) {
    throw new Error('Specify either --recipe-id or --recipe, not both.');
  }

  if (idValue) {
    const id = parsePositiveInteger(idValue, '--recipe-id');
    const recipe = recipes.find((candidate) => Number(candidate.id) === id);

    if (!recipe) {
      throw new Error(`Unknown recipe id: ${id}. Available recipes: ${formatRecipeChoices(recipes)}`);
    }

    return {
      id,
      name: recipe.name,
    };
  }

  const name = normalizeText(nameValue);

  if (!name) {
    throw new Error('Missing required option: --recipe or --recipe-id');
  }

  const matches = recipes.filter((recipe) => normalizeTerm(recipe.name) === normalizeTerm(name));

  if (matches.length === 1) {
    return {
      id: Number(matches[0].id),
      name: matches[0].name,
    };
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous recipe: ${name}. Matches: ${formatRecipeChoices(matches)}`);
  }

  throw new Error(`Unknown recipe: ${name}. Available recipes: ${formatRecipeChoices(recipes)}`);
}

function formatRecipeChoices(recipes) {
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return 'none';
  }

  return recipes
    .map((recipe) => `${recipe.id}:${recipe.name || 'unnamed'}`)
    .join(', ');
}

function parsePositiveInteger(value, label) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return numberValue;
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
  buildIngredientInput,
  buildRecipeIngredientAddPlan,
  formatRecipeChoices,
  resolveRecipeOption,
  runRecipeIngredientAddCommand,
};
