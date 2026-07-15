'use strict';

const {
  buildMealPlanRecipePayload,
  parseDate,
  resolveMealPlanSection,
  resolveRecipeForMealPlan,
} = require('./meal-plan-shared');

async function runMealPlanAddCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for meal-plan-add: ${format}`);
  }

  rejectUnsupportedServings(options);

  const [recipes, sections] = await Promise.all([
    client.getRecipes(),
    client.getMealPlanSections(),
  ]);
  const recipe = resolveRecipeForMealPlan({
    recipes,
    idValue: options['recipe-id'],
    nameValue: options.recipe,
  });
  const sectionId = resolveMealPlanSection({
    idValue: options['section-id'],
    nameValue: options.section,
    sections,
  });
  const payload = buildMealPlanRecipePayload({
    date: parseDate(options.date, '--date'),
    recipeId: Number(recipe.id),
    sectionId,
    note: Object.hasOwn(options, 'note') ? options.note : undefined,
  });
  const result = await client.createMealPlanEntry(payload);

  return JSON.stringify({
    action: 'created',
    entity: 'meal_plan',
    recipe: {
      id: Number(recipe.id),
      name: recipe.name || '',
    },
    payload,
    result,
  }, null, 2);
}

function rejectUnsupportedServings(options) {
  if (Object.hasOwn(options, 'servings')) {
    throw new Error('Grocy meal plan rows do not support per-row servings. Omit --servings; adjust the recipe desired servings separately if needed.');
  }
}

module.exports = {
  runMealPlanAddCommand,
};
