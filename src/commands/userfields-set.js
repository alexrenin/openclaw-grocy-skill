'use strict';

const { parseEntity, normalizeUserfields } = require('./userfields');
const { parseObjectId } = require('./userfields-get');

async function runUserfieldsSetCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for userfields-set: ${format}`);
  }

  const entity = parseEntity(options.entity);
  const [userfields, objects] = await Promise.all([
    client.getUserfields(),
    needsObjectLookup(options) ? client.getObjects(entity) : Promise.resolve([]),
  ]);
  const definitions = normalizeUserfields(userfields, entity);
  const object = resolveObjectOption(options, objects);
  const payload = buildUserfieldValuesPayload(options, definitions);
  const result = await client.setObjectUserfields(entity, object.id, payload);

  return JSON.stringify({
    action: 'updated',
    entity: 'userfields',
    target: {
      entity,
      objectId: object.id,
      objectName: object.name,
    },
    payload,
    result,
  }, null, 2);
}

function buildUserfieldValuesPayload(options, definitions) {
  const rawValues = parseValuesOption(options);
  const payload = {};

  for (const [fieldKey, value] of Object.entries(rawValues)) {
    const definition = resolveUserfieldDefinition(fieldKey, definitions);

    payload[definition.name] = normalizeUserfieldValue(value, definition);
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No userfield values provided. Use --values or --field with --value.');
  }

  return payload;
}

function parseValuesOption(options) {
  const hasValues = options.values != null && options.values !== '';
  const hasField = options.field != null && options.field !== '';
  const hasValue = options.value != null;

  if (hasValues && (hasField || hasValue)) {
    throw new Error('Use either --values or --field with --value, not both.');
  }

  if (hasValues) {
    let parsed;

    try {
      parsed = JSON.parse(options.values);
    } catch (error) {
      throw new Error(`--values must be a JSON object: ${error.message}`);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('--values must be a JSON object.');
    }

    return parsed;
  }

  if (hasField) {
    if (!hasValue) {
      throw new Error('Missing required option: --value');
    }

    return {
      [options.field]: options.value,
    };
  }

  throw new Error('Missing required option: --values or --field');
}

function resolveUserfieldDefinition(value, definitions) {
  const key = normalizeTerm(value);

  if (!key) {
    throw new Error('Userfield name cannot be empty.');
  }

  const matches = definitions.filter((definition) => {
    return [
      definition.name,
      definition.caption,
    ]
      .map(normalizeTerm)
      .includes(key);
  });

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous userfield: ${value}. Matches: ${formatUserfieldChoices(matches)}`);
  }

  throw new Error(`Unknown userfield: ${value}. Available userfields: ${formatUserfieldChoices(definitions)}`);
}

function normalizeUserfieldValue(value, definition) {
  if (value == null) {
    return '';
  }

  if (definition.type === 'checkbox') {
    return parseCheckboxValue(value, definition.name);
  }

  if (definition.type === 'number-integral') {
    return parseIntegerValue(value, definition.name);
  }

  if (definition.type === 'number-decimal' || definition.type === 'number-currency') {
    return parseNumberValue(value, definition.name);
  }

  if (definition.type === 'preset-checklist' && Array.isArray(value)) {
    return value.join(',');
  }

  return String(value);
}

function parseCheckboxValue(value, fieldName) {
  const normalized = normalizeTerm(value);

  if (value === true || value === 1 || ['1', 'true', 'yes', 'y', 'да'].includes(normalized)) {
    return 1;
  }

  if (value === false || value === 0 || ['0', 'false', 'no', 'n', 'нет'].includes(normalized)) {
    return 0;
  }

  throw new Error(`Userfield ${fieldName} expects a checkbox value true/false or 1/0.`);
}

function parseIntegerValue(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    throw new Error(`Userfield ${fieldName} expects an integer value.`);
  }

  return numberValue;
}

function parseNumberValue(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Userfield ${fieldName} expects a numeric value.`);
  }

  return numberValue;
}

function resolveObjectOption(options, objects) {
  if (options['object-id'] && options['object-name']) {
    throw new Error('Specify either --object-id or --object-name, not both.');
  }

  if (options['object-id']) {
    return {
      id: parseObjectId(options['object-id']),
      name: undefined,
    };
  }

  const name = normalizeText(options['object-name']);

  if (!name) {
    throw new Error('Missing required option: --object-id or --object-name');
  }

  const matches = objects.filter((object) => normalizeTerm(object.name) === normalizeTerm(name));

  if (matches.length === 1) {
    return {
      id: String(matches[0].id),
      name: matches[0].name,
    };
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous object: ${name}. Matches: ${formatObjectChoices(matches)}`);
  }

  throw new Error(`Unknown object: ${name}. Available objects: ${formatObjectChoices(objects)}`);
}

function needsObjectLookup(options) {
  return Boolean(options['object-name']);
}

function formatUserfieldChoices(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    return 'none';
  }

  return definitions
    .map((definition) => `${definition.name}:${definition.caption || definition.name}`)
    .join(', ');
}

function formatObjectChoices(objects) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return 'none';
  }

  return objects
    .map((object) => `${object.id}:${object.name || 'unnamed'}`)
    .join(', ');
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function normalizeTerm(value) {
  return normalizeText(value)
    .toLowerCase()
    .replaceAll('ё', 'е');
}

module.exports = {
  buildUserfieldValuesPayload,
  formatObjectChoices,
  formatUserfieldChoices,
  normalizeUserfieldValue,
  parseValuesOption,
  resolveObjectOption,
  resolveUserfieldDefinition,
  runUserfieldsSetCommand,
};
