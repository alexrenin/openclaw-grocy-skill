'use strict';

const { formatTable } = require('../format-table');

async function runLocationsCommand({ client, format }) {
  const locations = await client.getLocations();
  const rows = normalizeLocations(locations);

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  if (format === 'table') {
    return formatTable(rows, [
      { key: 'id', label: 'id' },
      { key: 'name', label: 'name' },
      { key: 'description', label: 'description' },
    ]);
  }

  throw new Error(`Unsupported format for locations: ${format}`);
}

function normalizeLocations(locations) {
  return (locations || []).map((location) => ({
    id: location.id,
    name: location.name || '',
    description: location.description || '',
  }));
}

module.exports = {
  normalizeLocations,
  runLocationsCommand,
};
