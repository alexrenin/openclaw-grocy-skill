'use strict';

const { formatTable } = require('../format-table');
const { summarizeRichText } = require('../format-rich-text');

async function runRecipesCommand({ client, format }) {
  const [recipes, positions] = await Promise.all([
    client.getRecipes(),
    client.getRecipePositions(),
  ]);
  const rows = normalizeRecipes(recipes, positions);

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  if (format === 'table') {
    const tableRows = rows.map((row) => ({
      ...row,
      description: summarizeRichText(row.description),
    }));

    return formatTable(tableRows, [
      { key: 'id', label: 'id' },
      { key: 'name', label: 'name' },
      { key: 'description', label: 'description' },
      { key: 'base_servings', label: 'base_servings' },
      { key: 'desired_servings', label: 'desired_servings' },
      { key: 'ingredient_count', label: 'ingredients' },
    ]);
  }

  throw new Error(`Unsupported format for recipes: ${format}`);
}

function normalizeRecipes(recipes, positions = []) {
  const ingredientCounts = new Map();

  for (const position of positions || []) {
    const recipeId = Number(position.recipe_id);
    ingredientCounts.set(recipeId, (ingredientCounts.get(recipeId) || 0) + 1);
  }

  return (recipes || [])
    .filter(isReadableRecipe)
    .map((recipe) => ({
      id: Number(recipe.id),
      name: recipe.name || '',
      description: recipe.description || '',
      type: recipe.type || 'normal',
      base_servings: recipe.base_servings ?? '',
      desired_servings: recipe.desired_servings ?? '',
      ingredient_count: ingredientCounts.get(Number(recipe.id)) || 0,
    }));
}

function isReadableRecipe(recipe) {
  return !String(recipe?.type || '').startsWith('mealplan-');
}

module.exports = {
  isReadableRecipe,
  normalizeRecipes,
  runRecipesCommand,
};
