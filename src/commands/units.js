'use strict';

const { formatTable } = require('../format-table');

async function runUnitsCommand({ client, format }) {
  const quantityUnits = await client.getQuantityUnits();
  const rows = normalizeUnits(quantityUnits);

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  return formatTable(rows, [
    { key: 'id', label: 'id' },
    { key: 'name', label: 'name' },
    { key: 'name_plural', label: 'name_plural' },
    { key: 'description', label: 'description' },
  ]);
}

function normalizeUnits(quantityUnits) {
  return (quantityUnits || []).map((unit) => ({
    id: unit.id,
    name: unit.name || '',
    name_plural: unit.name_plural || '',
    description: unit.description || '',
  }));
}

module.exports = {
  normalizeUnits,
  runUnitsCommand,
};
