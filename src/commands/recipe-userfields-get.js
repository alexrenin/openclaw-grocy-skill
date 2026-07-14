'use strict';

const { formatTable } = require('../format-table');

async function runRecipeUserfieldsGetCommand({ client, format, options }) {
  const recipeId = parsePositiveInteger(options['recipe-id'], '--recipe-id');
  const values = await client.getObjectUserfields('recipes', recipeId);
  const rows = normalizeUserfieldValues(values);

  if (format === 'json') {
    return JSON.stringify(values || {}, null, 2);
  }

  if (format === 'table') {
    return formatTable(rows, [
      { key: 'name', label: 'name' },
      { key: 'value', label: 'value' },
    ]);
  }

  throw new Error(`Unsupported format for recipe-userfields-get: ${format}`);
}

function normalizeUserfieldValues(values) {
  return Object.entries(values || {})
    .map(([name, value]) => ({
      name,
      value: stringifyValue(value),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function stringifyValue(value) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function parsePositiveInteger(value, optionName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }

  return numberValue;
}

module.exports = {
  normalizeUserfieldValues,
  runRecipeUserfieldsGetCommand,
};
