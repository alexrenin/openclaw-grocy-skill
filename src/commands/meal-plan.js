'use strict';

const { formatTable } = require('../format-table');
const {
  filterMealPlanEntries,
  normalizeMealPlanEntries,
  parseOptionalDate,
} = require('./meal-plan-shared');

async function runMealPlanCommand({ client, format, options }) {
  const [entries, recipes, sections] = await Promise.all([
    client.getMealPlanEntries(),
    client.getRecipes(),
    client.getMealPlanSections(),
  ]);
  const from = parseOptionalDate(options.from, '--from');
  const to = parseOptionalDate(options.to, '--to');
  const rows = filterMealPlanEntries(normalizeMealPlanEntries(entries, recipes, sections), { from, to });

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  if (format === 'table') {
    return formatTable(rows, [
      { key: 'id', label: 'id' },
      { key: 'date', label: 'date' },
      { key: 'section_name', label: 'section' },
      { key: 'recipe_name', label: 'recipe' },
      { key: 'note', label: 'note' },
    ]);
  }

  throw new Error(`Unsupported format for meal-plan: ${format}`);
}

module.exports = {
  runMealPlanCommand,
};
