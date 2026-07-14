'use strict';

const { resolveRecipePositionOption } = require('./recipe-ingredient-update');

async function runRecipeIngredientDeleteCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for recipe-ingredient-delete: ${format}`);
  }

  const [recipes, products, positions] = await Promise.all([
    client.getRecipes(),
    client.getProducts(),
    client.getRecipePositions(),
  ]);
  const plan = buildRecipeIngredientDeletePlan(options, recipes, products, positions);
  const result = await client.deleteRecipePosition(plan.position.id);

  return JSON.stringify({
    action: 'deleted',
    entity: 'recipes_pos',
    position: plan.position,
    result,
  }, null, 2);
}

function buildRecipeIngredientDeletePlan(options, recipes, products, positions) {
  const position = resolveRecipePositionOption(options, recipes, products, positions);

  return { position };
}

module.exports = {
  buildRecipeIngredientDeletePlan,
  runRecipeIngredientDeleteCommand,
};
