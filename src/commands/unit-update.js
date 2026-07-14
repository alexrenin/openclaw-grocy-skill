'use strict';

const {
  findQuantityUnitMatches,
  formatUnitChoices,
  normalizeText,
  parsePositiveInteger,
} = require('./product-create');

async function runUnitUpdateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for unit-update: ${format}`);
  }

  const quantityUnits = await client.getQuantityUnits();
  const plan = buildUnitUpdatePlan({ options, quantityUnits });
  const result = await client.updateQuantityUnit(plan.unit.id, plan.payload);

  return JSON.stringify({
    action: 'updated',
    entity: 'quantity_units',
    unit: plan.unit,
    payload: plan.payload,
    result,
  }, null, 2);
}

function buildUnitUpdatePlan({ options, quantityUnits }) {
  const unit = resolveUnitSelector({
    idValue: options['unit-id'],
    nameValue: options.unit,
    quantityUnits,
  });
  const payload = { ...unit };
  const changedFields = new Set();

  if (Object.hasOwn(options, 'name')) {
    const name = normalizeText(options.name);

    if (!name) {
      throw new Error('--name must not be empty');
    }

    payload.name = name;
    changedFields.add('name');
  }

  if (Object.hasOwn(options, 'name-plural')) {
    const namePlural = normalizeText(options['name-plural']);

    if (!namePlural) {
      throw new Error('--name-plural must not be empty');
    }

    payload.name_plural = namePlural;
    changedFields.add('name_plural');
  }

  if (Object.hasOwn(options, 'description')) {
    payload.description = normalizeText(options.description);
    changedFields.add('description');
  }

  if (changedFields.size === 0) {
    throw new Error('At least one quantity unit field must be provided.');
  }

  return {
    unit: {
      id: Number(unit.id),
      name: unit.name || '',
      name_plural: unit.name_plural || '',
    },
    payload,
  };
}

function resolveUnitSelector({ idValue, nameValue, quantityUnits }) {
  if (idValue && nameValue) {
    throw new Error('Specify either --unit-id or --unit, not both.');
  }

  if (idValue) {
    const unitId = parsePositiveInteger(idValue, '--unit-id');
    const unit = (quantityUnits || []).find((candidate) => Number(candidate.id) === unitId);

    if (!unit) {
      throw new Error(`Unknown quantity unit id: ${unitId}. Available units: ${formatUnitChoices(quantityUnits)}`);
    }

    return unit;
  }

  const unitName = normalizeText(nameValue);

  if (!unitName) {
    throw new Error('Missing required option: --unit or --unit-id');
  }

  const matches = findQuantityUnitMatches(unitName, quantityUnits || []);

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous quantity unit: ${unitName}. Matches: ${formatUnitChoices(matches)}`);
  }

  throw new Error(`Unknown quantity unit: ${unitName}. Available units: ${formatUnitChoices(quantityUnits)}`);
}

module.exports = {
  buildUnitUpdatePlan,
  resolveUnitSelector,
  runUnitUpdateCommand,
};
