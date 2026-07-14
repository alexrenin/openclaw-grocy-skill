'use strict';

const { formatTable } = require('../format-table');
const { parseEntity } = require('./userfields');

async function runUserfieldsGetCommand({ client, format, options }) {
  const entity = parseEntity(options.entity);
  const objectId = parseObjectId(options['object-id']);
  const values = await client.getObjectUserfields(entity, objectId);
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

  throw new Error(`Unsupported format for userfields-get: ${format}`);
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

function parseObjectId(value) {
  const objectId = String(value || '').trim();

  if (!objectId) {
    throw new Error('Missing required option: --object-id');
  }

  if (!/^[A-Za-z0-9_-]+$/.test(objectId)) {
    throw new Error('--object-id must contain only letters, digits, underscores, and hyphens');
  }

  return objectId;
}

module.exports = {
  normalizeUserfieldValues,
  parseObjectId,
  runUserfieldsGetCommand,
};
