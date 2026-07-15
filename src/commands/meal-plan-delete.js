'use strict';

const { parsePositiveInteger, normalizeText } = require('./product-create');

async function runMealPlanDeleteCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for meal-plan-delete: ${format}`);
  }

  const entryId = parsePositiveInteger(options['entry-id'], '--entry-id');
  const [entry, recipes] = await Promise.all([
    client.getMealPlanEntry(entryId),
    client.getRecipes(),
  ]);

  if (!entry) {
    throw new Error(`Unknown meal plan entry id: ${entryId}`);
  }

  const recipe = recipes.find((candidate) => Number(candidate.id) === Number(entry.recipe_id));
  const confirmRecipeName = normalizeText(options['confirm-recipe-name']);

  if (confirmRecipeName && normalizeText(recipe?.name) !== confirmRecipeName) {
    throw new Error(`Confirmation recipe name does not match meal plan entry ${entryId}. Expected: ${recipe?.name || 'none'}`);
  }

  const result = await client.deleteMealPlanEntry(entryId);

  return JSON.stringify({
    action: 'deleted',
    entity: 'meal_plan',
    entry: {
      id: entryId,
      date: entry.day || '',
      recipe_id: entry.recipe_id == null ? '' : Number(entry.recipe_id),
      recipe_name: recipe?.name || '',
    },
    result,
  }, null, 2);
}

module.exports = {
  runMealPlanDeleteCommand,
};
