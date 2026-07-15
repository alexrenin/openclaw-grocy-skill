'use strict';

const {
  buildCurrentMealPlanPayload,
  parseDate,
  resolveMealPlanSection,
  resolveRecipeForMealPlan,
} = require('./meal-plan-shared');
const { parsePositiveInteger } = require('./product-create');

async function runMealPlanUpdateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for meal-plan-update: ${format}`);
  }

  const entryId = parsePositiveInteger(options['entry-id'], '--entry-id');
  const [entry, recipes, sections] = await Promise.all([
    client.getMealPlanEntry(entryId),
    client.getRecipes(),
    client.getMealPlanSections(),
  ]);

  if (!entry) {
    throw new Error(`Unknown meal plan entry id: ${entryId}`);
  }

  const plan = buildMealPlanUpdatePlan({ entry, recipes, sections, options });
  const result = await client.updateMealPlanEntry(entryId, plan.payload);

  return JSON.stringify({
    action: 'updated',
    entity: 'meal_plan',
    entry_id: entryId,
    changed_fields: plan.changed_fields,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildMealPlanUpdatePlan({ entry, recipes, sections, options }) {
  const payload = buildCurrentMealPlanPayload(entry);
  const changedFields = new Set();

  if (Object.hasOwn(options, 'servings')) {
    throw new Error('Grocy meal plan rows do not support per-row servings. Omit --servings; adjust the recipe desired servings separately if needed.');
  }

  if (Object.hasOwn(options, 'date')) {
    payload.day = parseDate(options.date, '--date');
    changedFields.add('day');
  }

  if (Object.hasOwn(options, 'recipe') || Object.hasOwn(options, 'recipe-id')) {
    const recipe = resolveRecipeForMealPlan({
      recipes,
      idValue: options['recipe-id'],
      nameValue: options.recipe,
    });

    payload.type = 'recipe';
    payload.recipe_id = Number(recipe.id);
    delete payload.product_id;
    changedFields.add('recipe_id');
  }

  if (Object.hasOwn(options, 'section') || Object.hasOwn(options, 'section-id')) {
    payload.section_id = resolveMealPlanSection({
      idValue: options['section-id'],
      nameValue: options.section,
      sections,
    });
    changedFields.add('section_id');
  }

  if (Object.hasOwn(options, 'note')) {
    payload.note = options.note;
    changedFields.add('note');
  }

  if (changedFields.size === 0) {
    throw new Error('At least one meal plan field must be provided.');
  }

  return {
    changed_fields: [...changedFields],
    payload,
  };
}

module.exports = {
  buildMealPlanUpdatePlan,
  runMealPlanUpdateCommand,
};
