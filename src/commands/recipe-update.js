'use strict';

const {
  normalizeText,
  parsePositiveInteger,
} = require('./product-create');
const { formatRecipeChoices } = require('./recipe-ingredient-add');

async function runRecipeUpdateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for recipe-update: ${format}`);
  }

  const recipes = await client.getRecipes();
  const plan = buildRecipeUpdatePlan(options, recipes);
  const result = await client.updateRecipe(plan.recipe.id, plan.payload);

  return JSON.stringify({
    action: 'updated',
    entity: 'recipes',
    recipe: plan.recipe,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildRecipeUpdatePlan(options, recipes) {
  const recipe = resolveRecipeObject({
    idValue: options['recipe-id'],
    nameValue: options.recipe,
    recipes,
  });
  const payload = buildCurrentRecipePayload(recipe);
  const changedFields = new Set();

  if (Object.hasOwn(options, 'name')) {
    const name = normalizeText(options.name);

    if (!name) {
      throw new Error('--name must not be empty');
    }

    payload.name = name;
    changedFields.add('name');
  }

  if (Object.hasOwn(options, 'description')) {
    payload.description = normalizeText(options.description);
    changedFields.add('description');
  }

  if (Object.hasOwn(options, 'base-servings')) {
    payload.base_servings = parsePositiveInteger(options['base-servings'], '--base-servings');
    changedFields.add('base_servings');
  }

  if (Object.hasOwn(options, 'desired-servings')) {
    payload.desired_servings = parsePositiveInteger(options['desired-servings'], '--desired-servings');
    changedFields.add('desired_servings');
  }

  if (changedFields.size === 0) {
    throw new Error('At least one recipe field must be provided.');
  }

  return {
    recipe: {
      id: Number(recipe.id),
      name: recipe.name || '',
    },
    payload,
  };
}

function buildCurrentRecipePayload(recipe) {
  const payload = {
    name: recipe.name,
    type: recipe.type || 'normal',
  };

  copyExistingField(recipe, payload, 'description');
  copyExistingField(recipe, payload, 'base_servings');
  copyExistingField(recipe, payload, 'desired_servings');
  copyExistingField(recipe, payload, 'not_check_shoppinglist');

  return payload;
}

function copyExistingField(source, target, fieldName) {
  if (source[fieldName] !== undefined) {
    target[fieldName] = source[fieldName];
  }
}

function resolveRecipeObject({ idValue, nameValue, recipes }) {
  if (idValue && nameValue) {
    throw new Error('Specify either --recipe-id or --recipe, not both.');
  }

  if (idValue) {
    const id = parsePositiveInteger(idValue, '--recipe-id');
    const recipe = recipes.find((candidate) => Number(candidate.id) === id);

    if (!recipe) {
      throw new Error(`Unknown recipe id: ${id}. Available recipes: ${formatRecipeChoices(recipes)}`);
    }

    return recipe;
  }

  const name = normalizeText(nameValue);

  if (!name) {
    throw new Error('Missing required option: --recipe or --recipe-id');
  }

  const matches = recipes.filter((recipe) => normalizeTerm(recipe.name) === normalizeTerm(name));

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous recipe: ${name}. Matches: ${formatRecipeChoices(matches)}`);
  }

  throw new Error(`Unknown recipe: ${name}. Available recipes: ${formatRecipeChoices(recipes)}`);
}

function normalizeTerm(value) {
  return normalizeText(value).toLowerCase().replaceAll('С‘', 'Рµ');
}

module.exports = {
  buildCurrentRecipePayload,
  buildRecipeUpdatePlan,
  resolveRecipeObject,
  runRecipeUpdateCommand,
};
