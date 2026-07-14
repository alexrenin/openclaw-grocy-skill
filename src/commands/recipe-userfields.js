'use strict';

const { formatTable } = require('../format-table');

async function runRecipeUserfieldsCommand({ client, format }) {
  const userfields = await client.getUserfields();
  const rows = normalizeRecipeUserfields(userfields);

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  if (format === 'table') {
    return formatTable(rows, [
      { key: 'id', label: 'id' },
      { key: 'name', label: 'name' },
      { key: 'caption', label: 'caption' },
      { key: 'type', label: 'type' },
      { key: 'show_as_column_in_tables', label: 'table_column' },
    ]);
  }

  throw new Error(`Unsupported format for recipe-userfields: ${format}`);
}

function normalizeRecipeUserfields(userfields) {
  return (userfields || [])
    .filter((field) => field.entity === 'recipes')
    .map((field) => ({
      id: field.id,
      name: field.name || '',
      caption: field.caption || '',
      type: field.type || '',
      show_as_column_in_tables: field.show_as_column_in_tables ?? '',
      sort_number: field.sort_number ?? '',
    }))
    .sort((a, b) => {
      const sortA = Number(a.sort_number || 0);
      const sortB = Number(b.sort_number || 0);

      return sortA - sortB || String(a.name).localeCompare(String(b.name));
    });
}

module.exports = {
  normalizeRecipeUserfields,
  runRecipeUserfieldsCommand,
};
