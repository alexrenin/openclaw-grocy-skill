'use strict';

const { normalizeText, parsePositiveInteger, parsePositiveNumber } = require('./product-create');
const { resolveRecipeObject } = require('./recipe-update');
const { isReadableRecipe } = require('./recipes');

async function buildMenuPlan({ client, options }) {
  const [recipes, positions, products, quantityUnits, quantityUnitConversions, stock] = await Promise.all([
    client.getRecipes(),
    client.getRecipePositions(),
    client.getProducts(),
    client.getQuantityUnits(),
    client.getQuantityUnitConversions(),
    client.getStock(),
  ]);

  return calculateMenuPlan({
    selections: parseMenuSelections(options),
    recipes: (recipes || []).filter(isReadableRecipe),
    positions,
    products,
    quantityUnits,
    quantityUnitConversions,
    stock,
  });
}

async function buildMenuPlanRecommendations({ client, options }) {
  const [recipes, positions, products, quantityUnits, quantityUnitConversions, stock] = await Promise.all([
    client.getRecipes(),
    client.getRecipePositions(),
    client.getProducts(),
    client.getQuantityUnits(),
    client.getQuantityUnitConversions(),
    client.getStock(),
  ]);
  const menuPlanOptions = parseMenuPlanOptions(options);
  const readableRecipes = (recipes || []).filter(isReadableRecipe);
  const dataset = {
    recipes: readableRecipes,
    positions,
    products,
    quantityUnits,
    quantityUnitConversions,
    stock,
  };
  const candidates = readableRecipes
    .map((recipe) => buildRecipeCandidate({
      recipe,
      servings: menuPlanOptions.servings,
      dataset,
    }))
    .filter((candidate) => !menuPlanOptions.onlyReady || candidate.can_cook)
    .sort(compareRecipeCandidates);
  const selected = candidates
    .slice(0, menuPlanOptions.count)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
  const aggregatePlan = selected.length === 0
    ? buildEmptyMenuPlan()
    : calculateMenuPlan({
      selections: selected.map((candidate) => ({
        id: candidate.recipe_id,
        servings: candidate.servings,
      })),
      ...dataset,
    });

  return {
    count_requested: menuPlanOptions.count,
    servings: menuPlanOptions.servings ?? '',
    only_ready: menuPlanOptions.onlyReady,
    candidate_count: readableRecipes.length,
    selected_count: selected.length,
    selected,
    aggregate_plan: {
      status: aggregatePlan.status,
      can_cook: aggregatePlan.can_cook,
      recipes: aggregatePlan.recipes,
      missing: aggregatePlan.missing,
      unresolved: aggregatePlan.unresolved,
    },
    shopping_list: buildMenuShoppingList(aggregatePlan),
  };
}

function parseMenuPlanOptions(options = {}) {
  return {
    count: Object.hasOwn(options, 'count')
      ? parsePositiveInteger(options.count, '--count')
      : 3,
    servings: Object.hasOwn(options, 'servings')
      ? parsePositiveNumber(options.servings, '--servings')
      : undefined,
    onlyReady: Object.hasOwn(options, 'only-ready')
      ? parseBooleanOption(options['only-ready'], '--only-ready')
      : false,
  };
}

function parseMenuSelections(options = {}) {
  const hasBulk = Object.hasOwn(options, 'recipes');
  const hasSingle = Object.hasOwn(options, 'recipe') || Object.hasOwn(options, 'recipe-id');

  if (hasBulk && hasSingle) {
    throw new Error('Specify either --recipes or --recipe/--recipe-id, not both.');
  }

  if (hasBulk) {
    let parsed;

    try {
      parsed = JSON.parse(options.recipes);
    } catch (error) {
      throw new Error(`--recipes must be a JSON array: ${error.message}`);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('--recipes must be a non-empty JSON array.');
    }

    return parsed.map(normalizeSelection);
  }

  if (hasSingle) {
    return [normalizeSelection({
      name: options.recipe,
      id: options['recipe-id'],
      servings: options.servings,
    })];
  }

  throw new Error('Missing required option: --recipe, --recipe-id, or --recipes');
}

function normalizeSelection(value) {
  if (typeof value === 'string') {
    return normalizeSelection({ name: value });
  }

  if (typeof value === 'number') {
    return normalizeSelection({ id: value });
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Each recipe selection must be a recipe name, recipe id, or object.');
  }

  const idValue = value.id ?? value.recipe_id ?? value['recipe-id'];
  const nameValue = value.name ?? value.recipe;
  const servingsValue = value.servings;

  if (idValue != null && normalizeText(nameValue)) {
    throw new Error('Each recipe selection must use either id or name, not both.');
  }

  return {
    id: idValue == null || idValue === '' ? undefined : parsePositiveInteger(idValue, 'recipe id'),
    name: normalizeText(nameValue) || undefined,
    servings: servingsValue == null || servingsValue === ''
      ? undefined
      : parsePositiveNumber(servingsValue, 'servings'),
  };
}

function buildRecipeCandidate({ recipe, servings, dataset }) {
  const plan = calculateMenuPlan({
    selections: [{ id: Number(recipe.id), servings }],
    ...dataset,
  });
  const resolvedRequirementCount = plan.requirements.length;
  const readyRequirementCount = plan.requirements
    .filter((requirement) => requirement.missing_amount <= 0)
    .length;
  const denominator = resolvedRequirementCount + plan.unresolved.length;
  const readinessScore = denominator === 0
    ? 1
    : readyRequirementCount / denominator;
  const plannedRecipe = plan.recipes[0] || {};

  return {
    recipe_id: Number(recipe.id),
    recipe_name: recipe.name || '',
    servings: plannedRecipe.servings ?? servings ?? '',
    status: plan.status,
    can_cook: plan.can_cook,
    ingredient_count: plannedRecipe.ingredient_count || 0,
    ready_ingredient_count: readyRequirementCount,
    missing_count: plan.missing.length,
    unresolved_count: plan.unresolved.length,
    readiness_score: roundAmount(readinessScore),
    missing: plan.missing,
    unresolved: plan.unresolved,
  };
}

function calculateMenuPlan({
  selections,
  recipes,
  positions = [],
  products = [],
  quantityUnits = [],
  quantityUnitConversions = [],
  stock = [],
}) {
  const productsById = mapById(products);
  const quantityUnitsById = mapById(quantityUnits);
  const stockByProductId = aggregateStockByProductId(stock);
  const recipeResults = [];
  const ingredientRows = [];
  const unresolved = [];
  const requirementsByProductId = new Map();

  for (const selection of selections) {
    const recipe = resolveRecipeObject({
      idValue: selection.id,
      nameValue: selection.name,
      recipes,
    });
    const servingPlan = buildServingPlan(recipe, selection);
    const recipeId = Number(recipe.id);
    const recipeIngredients = (positions || []).filter((position) => Number(position.recipe_id) === recipeId);

    recipeResults.push({
      id: recipeId,
      name: recipe.name || '',
      servings: servingPlan.targetServings,
      base_servings: servingPlan.baseServings,
      scale: roundAmount(servingPlan.scale),
      ingredient_count: recipeIngredients.length,
    });

    for (const position of recipeIngredients) {
      const ingredient = normalizeIngredientRequirement({
        recipe,
        position,
        productsById,
        quantityUnitsById,
        quantityUnitConversions,
        scale: servingPlan.scale,
      });

      ingredientRows.push(ingredient);

      if (ingredient.unresolved_reason) {
        unresolved.push({
          recipe_id: recipeId,
          recipe_name: recipe.name || '',
          product_id: ingredient.product_id,
          product_name: ingredient.product_name,
          amount: ingredient.required_amount,
          unit: ingredient.required_unit,
          reason: ingredient.unresolved_reason,
        });
        continue;
      }

      const current = requirementsByProductId.get(ingredient.product_id) || {
        product_id: ingredient.product_id,
        product_name: ingredient.product_name,
        required_amount: 0,
        unit: ingredient.stock_unit,
      };

      current.required_amount += ingredient.required_stock_amount;
      requirementsByProductId.set(ingredient.product_id, current);
    }
  }

  const requirements = [...requirementsByProductId.values()]
    .map((requirement) => {
      const available = stockByProductId.get(requirement.product_id) || 0;
      const missingAmount = Math.max(0, requirement.required_amount - available);

      return {
        ...requirement,
        required_amount: roundAmount(requirement.required_amount),
        available_amount: roundAmount(available),
        missing_amount: roundAmount(missingAmount),
      };
    })
    .sort((left, right) => left.product_name.localeCompare(right.product_name));

  const missing = requirements
    .filter((requirement) => requirement.missing_amount > 0)
    .map((requirement) => ({
      product_id: requirement.product_id,
      product_name: requirement.product_name,
      amount: requirement.missing_amount,
      unit: requirement.unit,
      required_amount: requirement.required_amount,
      available_amount: requirement.available_amount,
    }));

  const status = resolveStatus(missing, unresolved);

  return {
    status,
    can_cook: status === 'ready',
    recipes: recipeResults,
    ingredients: ingredientRows,
    requirements,
    missing,
    unresolved,
  };
}

function buildEmptyMenuPlan() {
  return {
    status: 'ready',
    can_cook: true,
    recipes: [],
    ingredients: [],
    requirements: [],
    missing: [],
    unresolved: [],
  };
}

function buildServingPlan(recipe, selection) {
  const baseServings = parseOptionalPositiveNumber(recipe.base_servings);
  const desiredServings = parseOptionalPositiveNumber(recipe.desired_servings);

  if (selection.servings != null && !baseServings) {
    throw new Error(`Recipe "${recipe.name || recipe.id}" has no positive base_servings; cannot scale to explicit servings.`);
  }

  const targetServings = selection.servings ?? desiredServings ?? baseServings ?? 1;
  const divisor = baseServings ?? targetServings;

  return {
    baseServings: baseServings ?? '',
    targetServings,
    scale: targetServings / divisor,
  };
}

function normalizeIngredientRequirement({
  recipe,
  position,
  productsById,
  quantityUnitsById,
  quantityUnitConversions,
  scale,
}) {
  const productId = Number(position.product_id);
  const requiredUnitId = Number(position.qu_id);
  const amount = Number(position.amount);
  const product = productsById.get(productId);
  const requiredUnit = quantityUnitsById.get(requiredUnitId);
  const requiredAmount = roundAmount(amount * scale);
  const base = {
    recipe_id: Number(recipe.id),
    recipe_name: recipe.name || '',
    position_id: Number(position.id),
    product_id: productId,
    product_name: product?.name || '',
    required_amount: requiredAmount,
    required_unit: requiredUnit?.name || '',
    stock_amount: '',
    stock_unit: '',
    conversion_factor: '',
    unresolved_reason: '',
  };

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ...base, unresolved_reason: 'invalid ingredient amount' };
  }

  if (!product) {
    return {
      ...base,
      product_name: position.product_name || '',
      unresolved_reason: 'ingredient product not found',
    };
  }

  const stockUnitId = Number(product.qu_id_stock);
  const stockUnit = quantityUnitsById.get(stockUnitId);

  if (!Number.isInteger(requiredUnitId) || requiredUnitId <= 0 || !requiredUnit) {
    return { ...base, unresolved_reason: 'ingredient quantity unit not found' };
  }

  if (!Number.isInteger(stockUnitId) || stockUnitId <= 0 || !stockUnit) {
    return { ...base, unresolved_reason: 'product stock unit not found' };
  }

  const conversionFactor = findConversionFactor({
    productId,
    fromUnitId: requiredUnitId,
    toUnitId: stockUnitId,
    quantityUnitConversions,
  });

  if (conversionFactor == null) {
    return {
      ...base,
      product_name: product.name || '',
      stock_unit: stockUnit.name || '',
      unresolved_reason: `missing conversion from ${requiredUnit.name || requiredUnitId} to ${stockUnit.name || stockUnitId}`,
    };
  }

  return {
    ...base,
    product_name: product.name || '',
    stock_amount: roundAmount(requiredAmount * conversionFactor),
    stock_unit: stockUnit.name || '',
    required_stock_amount: requiredAmount * conversionFactor,
    conversion_factor: roundAmount(conversionFactor),
  };
}

function findConversionFactor({ productId, fromUnitId, toUnitId, quantityUnitConversions = [] }) {
  if (Number(fromUnitId) === Number(toUnitId)) {
    return 1;
  }

  const candidates = (quantityUnitConversions || [])
    .filter((conversion) => {
      const conversionProductId = conversion.product_id == null ? 0 : Number(conversion.product_id);

      return conversionProductId === 0 || conversionProductId === Number(productId);
    })
    .sort((left, right) => conversionPriority(right, productId) - conversionPriority(left, productId));

  const direct = candidates.find((conversion) => (
    Number(conversion.from_qu_id) === Number(fromUnitId)
    && Number(conversion.to_qu_id) === Number(toUnitId)
    && Number(conversion.factor) > 0
  ));

  if (direct) {
    return Number(direct.factor);
  }

  const reverse = candidates.find((conversion) => (
    Number(conversion.from_qu_id) === Number(toUnitId)
    && Number(conversion.to_qu_id) === Number(fromUnitId)
    && Number(conversion.factor) > 0
  ));

  if (reverse) {
    return 1 / Number(reverse.factor);
  }

  return undefined;
}

function conversionPriority(conversion, productId) {
  return Number(conversion.product_id) === Number(productId) ? 1 : 0;
}

function aggregateStockByProductId(stock = []) {
  const result = new Map();

  for (const item of stock || []) {
    const productId = Number(item.product_id);
    const amount = Number(item.amount);

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(amount)) {
      continue;
    }

    result.set(productId, (result.get(productId) || 0) + amount);
  }

  return result;
}

function resolveStatus(missing, unresolved) {
  if (missing.length > 0 && unresolved.length > 0) {
    return 'missing-and-unresolved';
  }

  if (missing.length > 0) {
    return 'missing';
  }

  if (unresolved.length > 0) {
    return 'unresolved';
  }

  return 'ready';
}

function formatMenuCheckText(plan) {
  const lines = [
    plan.can_cook
      ? '\u041c\u0435\u043d\u044e \u043c\u043e\u0436\u043d\u043e \u043f\u0440\u0438\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u0438\u0437 \u0442\u0435\u043a\u0443\u0449\u0438\u0445 \u0437\u0430\u043f\u0430\u0441\u043e\u0432.'
      : '\u041c\u0435\u043d\u044e \u043d\u0435\u043b\u044c\u0437\u044f \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u043f\u0440\u0438\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u0438\u0437 \u0442\u0435\u043a\u0443\u0449\u0438\u0445 \u0437\u0430\u043f\u0430\u0441\u043e\u0432.',
    '',
    '\u0420\u0435\u0446\u0435\u043f\u0442\u044b:',
    ...plan.recipes.map((recipe) => `\u2022 ${recipe.name} \u2014 ${formatAmount(recipe.servings)} \u043f\u043e\u0440\u0446.`),
  ];

  if (plan.missing.length > 0) {
    lines.push('', '\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432:');
    for (const item of plan.missing) {
      lines.push(`\u2022 ${item.product_name} \u2014 ${formatAmount(item.amount)} ${item.unit} (\u043d\u0443\u0436\u043d\u043e ${formatAmount(item.required_amount)}, \u0435\u0441\u0442\u044c ${formatAmount(item.available_amount)})`);
    }
  }

  appendUnresolvedText(lines, plan.unresolved);

  return lines.join('\n');
}

function formatMenuShoppingListText(plan) {
  const lines = [];

  if (plan.missing.length === 0 && plan.unresolved.length === 0) {
    return '\u041f\u043e\u043a\u0443\u043f\u043a\u0438 \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u043c\u0435\u043d\u044e \u043d\u0435 \u043d\u0443\u0436\u043d\u044b.';
  }

  if (plan.missing.length > 0) {
    lines.push('\u041d\u0443\u0436\u043d\u043e \u043a\u0443\u043f\u0438\u0442\u044c:');
    for (const item of plan.missing) {
      lines.push(`\u2022 ${item.product_name} \u2014 ${formatAmount(item.amount)} ${item.unit}`);
    }
  }

  appendUnresolvedText(lines, plan.unresolved);

  return lines.join('\n');
}

function buildMenuShoppingList(plan) {
  return {
    recipes: plan.recipes,
    items: plan.missing.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      amount: item.amount,
      unit: item.unit,
    })),
    unresolved: plan.unresolved,
  };
}

function formatMenuPlanText(recommendations) {
  if (recommendations.selected.length === 0) {
    return recommendations.only_ready
      ? '\u0413\u043e\u0442\u043e\u0432\u044b\u0445 \u0440\u0435\u0446\u0435\u043f\u0442\u043e\u0432 \u0434\u043b\u044f \u043f\u043b\u0430\u043d\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e.'
      : '\u041f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0445 \u0440\u0435\u0446\u0435\u043f\u0442\u043e\u0432 \u0434\u043b\u044f \u043f\u043b\u0430\u043d\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e.';
  }

  const lines = ['\u041f\u043b\u0430\u043d \u043c\u0435\u043d\u044e:'];

  for (const item of recommendations.selected) {
    const status = formatCandidateStatus(item);
    lines.push(`${item.rank}. ${item.recipe_name} \u2014 ${formatAmount(item.servings)} \u043f\u043e\u0440\u0446.; ${status}`);
  }

  if (recommendations.aggregate_plan.missing.length > 0) {
    lines.push('', '\u041e\u0431\u0449\u0438\u0439 \u0441\u043f\u0438\u0441\u043e\u043a \u043d\u0435\u0434\u043e\u0441\u0442\u0430\u044e\u0449\u0438\u0445 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432:');
    for (const item of recommendations.aggregate_plan.missing) {
      lines.push(`\u2022 ${item.product_name} \u2014 ${formatAmount(item.amount)} ${item.unit}`);
    }
  } else {
    lines.push('', '\u0414\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u043f\u043b\u0430\u043d\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 \u043d\u0435 \u043d\u0443\u0436\u043d\u044b.');
  }

  appendUnresolvedText(lines, recommendations.aggregate_plan.unresolved);

  return lines.join('\n');
}

function formatCandidateStatus(candidate) {
  if (candidate.can_cook) {
    return '\u043c\u043e\u0436\u043d\u043e \u043f\u0440\u0438\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c';
  }

  const parts = [];

  if (candidate.missing_count > 0) {
    parts.push(`\u043d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 ${candidate.missing_count}`);
  }

  if (candidate.unresolved_count > 0) {
    parts.push(`\u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c ${candidate.unresolved_count}`);
  }

  return parts.join(', ');
}

function appendUnresolvedText(lines, unresolved) {
  if (unresolved.length === 0) {
    return;
  }

  lines.push('', '\u041d\u0443\u0436\u043d\u043e \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c:');
  for (const item of unresolved) {
    const name = item.product_name || `product ${item.product_id}`;
    lines.push(`\u2022 ${item.recipe_name}: ${name} \u2014 ${item.reason}`);
  }
}

function parseOptionalPositiveNumber(value) {
  if (value == null || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined;
}

function roundAmount(value) {
  if (value === '' || value == null) {
    return value;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return value;
  }

  return Math.round((numberValue + Number.EPSILON) * 1e9) / 1e9;
}

function compareRecipeCandidates(left, right) {
  return statusRank(left.status) - statusRank(right.status)
    || left.missing_count - right.missing_count
    || left.unresolved_count - right.unresolved_count
    || right.readiness_score - left.readiness_score
    || right.ready_ingredient_count - left.ready_ingredient_count
    || left.recipe_name.localeCompare(right.recipe_name);
}

function statusRank(status) {
  const ranks = {
    ready: 0,
    missing: 1,
    unresolved: 2,
    'missing-and-unresolved': 3,
  };

  return ranks[status] ?? 99;
}

function parseBooleanOption(value, optionName) {
  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }

  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }

  throw new Error(`${optionName} must be true or false`);
}

function formatAmount(value) {
  if (value === '' || value == null) {
    return '';
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  const maximumFractionDigits = Math.abs(numberValue) > 0 && Math.abs(numberValue) < 0.001
    ? 9
    : 3;

  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(numberValue);
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  aggregateStockByProductId,
  buildMenuPlan,
  buildMenuPlanRecommendations,
  buildMenuShoppingList,
  buildServingPlan,
  calculateMenuPlan,
  findConversionFactor,
  formatAmount,
  formatMenuCheckText,
  formatMenuPlanText,
  formatMenuShoppingListText,
  parseMenuPlanOptions,
  parseMenuSelections,
  roundAmount,
};
