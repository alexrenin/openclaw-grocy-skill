'use strict';

const { formatTable } = require('../format-table');

async function runUserfieldsCommand({ client, format, options }) {
  const entity = parseEntity(options.entity);
  const userfields = await client.getUserfields();
  const rows = normalizeUserfields(userfields, entity);

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

  throw new Error(`Unsupported format for userfields: ${format}`);
}

function normalizeUserfields(userfields, entity) {
  return (userfields || [])
    .filter((field) => field.entity === entity)
    .map((field) => ({
      id: field.id,
      entity: field.entity || '',
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

function parseEntity(value) {
  const entity = String(value || '').trim();

  if (!entity) {
    throw new Error('Missing required option: --entity');
  }

  if (!/^[A-Za-z0-9_]+$/.test(entity)) {
    throw new Error('--entity must contain only letters, digits, and underscores');
  }

  return entity;
}

module.exports = {
  normalizeUserfields,
  parseEntity,
  runUserfieldsCommand,
};
