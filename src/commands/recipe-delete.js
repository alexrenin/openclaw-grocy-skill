'use strict';

const {
  normalizeText,
  parsePositiveInteger,
} = require('./product-create');
const { resolveRecipeObject } = require('./recipe-update');

async function runRecipeDeleteCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for recipe-delete: ${format}`);
  }

  const [recipes, positions] = await Promise.all([
    client.getRecipes(),
    client.getRecipePositions(),
  ]);
  const plan = buildRecipeDeletePlan({ options, recipes, positions });
  const deletedPositions = [];

  for (const position of plan.positionsToDelete) {
    const result = await client.deleteRecipePosition(position.id);
    deletedPositions.push({ position, result });
  }

  const result = await client.deleteRecipe(plan.recipe.id);

  return JSON.stringify({
    action: 'deleted',
    entity: 'recipes',
    recipe: plan.recipe,
    deletedPositions,
    checks: plan.checks,
    result,
  }, null, 2);
}

function buildRecipeDeletePlan({ options, recipes, positions = [] }) {
  const recipe = resolveRecipeObject({
    idValue: options['recipe-id'],
    nameValue: options.recipe,
    recipes,
  });
  const normalizedConfirmName = normalizeText(options['confirm-recipe-name']);
  const recipeName = normalizeText(recipe.name);

  if (normalizedConfirmName && normalizedConfirmName !== recipeName) {
    throw new Error(`--confirm-recipe-name does not match recipe ${recipe.id}:${recipeName || 'unnamed'}`);
  }

  const recipePositions = (positions || [])
    .filter((position) => Number(position.recipe_id) === Number(recipe.id))
    .map(normalizeRecipePosition)
    .sort((left, right) => left.id - right.id);
  const deleteIngredients = parseBooleanOption(options['delete-ingredients'], '--delete-ingredients');

  if (recipePositions.length > 0 && !deleteIngredients) {
    throw new Error([
      `Refusing to delete recipe ${recipe.id}:${recipeName || 'unnamed'} because it still has ingredient rows.`,
      `Ingredient position ids: ${recipePositions.map((position) => position.id).join(', ')}.`,
      'After explicit confirmation, rerun with --delete-ingredients true to delete those rows first, or remove them one by one with recipe-ingredient-delete.',
    ].join(' '));
  }

  return {
    recipe: {
      id: Number(recipe.id),
      name: recipeName,
    },
    positionsToDelete: deleteIngredients ? recipePositions : [],
    checks: {
      recipe_positions: recipePositions.length === 0 ? 'none' : `delete ${recipePositions.length}`,
    },
  };
}

function normalizeRecipePosition(position) {
  return {
    id: parsePositiveInteger(position.id, 'recipe position id'),
    recipeId: Number(position.recipe_id),
    productId: Number(position.product_id),
  };
}

function parseBooleanOption(value, optionName) {
  if (value == null || value === '') {
    return false;
  }

  const normalized = normalizeText(value).toLowerCase();

  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`${optionName} must be true or false`);
}

module.exports = {
  buildRecipeDeletePlan,
  parseBooleanOption,
  runRecipeDeleteCommand,
};
