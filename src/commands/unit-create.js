'use strict';

async function runUnitCreateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for unit-create: ${format}`);
  }

  const payload = buildQuantityUnitPayload(options);
  const result = await client.createQuantityUnit(payload);

  return JSON.stringify({
    action: 'created',
    entity: 'quantity_units',
    payload,
    result,
  }, null, 2);
}

function buildQuantityUnitPayload(options) {
  const name = normalizeText(options.name);

  if (!name) {
    throw new Error('Missing required option: --name');
  }

  const payload = {
    name,
    name_plural: normalizeText(options['name-plural']) || name,
  };

  const description = normalizeText(options.description);

  if (description) {
    payload.description = description;
  }

  return payload;
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

module.exports = {
  buildQuantityUnitPayload,
  runUnitCreateCommand,
};
