'use strict';

const { formatTable } = require('../format-table');
const { richTextToPlainText } = require('../format-rich-text');
const { resolveRecipeObject } = require('./recipe-update');
const { isReadableRecipe } = require('./recipes');

async function runRecipeGetCommand({ client, format, options }) {
  const [recipes, positions, products, quantityUnits] = await Promise.all([
    client.getRecipes(),
    client.getRecipePositions(),
    client.getProducts(),
    client.getQuantityUnits(),
  ]);
  const recipe = resolveRecipeObject({
    idValue: options['recipe-id'],
    nameValue: options.recipe,
    recipes: (recipes || []).filter(isReadableRecipe),
  });
  const result = normalizeRecipeDetails(recipe, positions, products, quantityUnits);

  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'table') {
    return formatRecipeDetailsTable(result);
  }

  throw new Error(`Unsupported format for recipe-get: ${format}`);
}

function normalizeRecipeDetails(recipe, positions = [], products = [], quantityUnits = []) {
  const productsById = mapById(products);
  const quantityUnitsById = mapById(quantityUnits);
  const recipeId = Number(recipe.id);

  return {
    id: recipeId,
    name: recipe.name || '',
    description: recipe.description || '',
    type: recipe.type || 'normal',
    base_servings: recipe.base_servings ?? '',
    desired_servings: recipe.desired_servings ?? '',
    ingredients: (positions || [])
      .filter((position) => Number(position.recipe_id) === recipeId)
      .map((position) => normalizeIngredient(position, productsById, quantityUnitsById)),
  };
}

function normalizeIngredient(position, productsById, quantityUnitsById) {
  const productId = Number(position.product_id);
  const unitId = Number(position.qu_id);

  return {
    position_id: Number(position.id),
    product_id: productId,
    product_name: productsById.get(productId)?.name || '',
    amount: position.amount ?? '',
    unit: quantityUnitsById.get(unitId)?.name || '',
    ingredient_group: position.ingredient_group || '',
    note: position.note || '',
    variable_amount: position.variable_amount || '',
    only_check_single_unit_in_stock: normalizeFlag(position.only_check_single_unit_in_stock),
    round_up: normalizeFlag(position.round_up),
  };
}

function formatRecipeDetailsTable(recipe) {
  const metadata = [
    `Recipe: ${recipe.id}:${recipe.name}`,
    `Description: ${richTextToPlainText(recipe.description)}`,
    `Type: ${recipe.type}`,
    `Base servings: ${recipe.base_servings}`,
    `Desired servings: ${recipe.desired_servings}`,
  ];
  const ingredients = recipe.ingredients.length === 0
    ? 'No ingredients'
    : formatTable(recipe.ingredients, [
      { key: 'position_id', label: 'position_id' },
      { key: 'product_id', label: 'product_id' },
      { key: 'product_name', label: 'product' },
      { key: 'amount', label: 'amount' },
      { key: 'unit', label: 'unit' },
      { key: 'ingredient_group', label: 'group' },
      { key: 'note', label: 'note' },
    ]);

  return `${metadata.join('\n')}\n\n${ingredients}`;
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

function normalizeFlag(value) {
  return value === true || value === 1 || value === '1';
}

module.exports = {
  formatRecipeDetailsTable,
  normalizeIngredient,
  normalizeRecipeDetails,
  runRecipeGetCommand,
};
