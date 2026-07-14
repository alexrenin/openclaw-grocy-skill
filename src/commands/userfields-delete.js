'use strict';

const { normalizeText, parseOptionalFlag } = require('./userfields-create');
const { resolveUserfieldSelector, summarizeUserfield } = require('./userfields-update');

async function runUserfieldsDeleteCommand({ client, format, options }) {
  if (format !== 'json') throw new Error(`Unsupported format for userfields-delete: ${format}`);
  const userfield = resolveUserfieldSelector(options, await client.getUserfields());
  const objects = await client.getObjects(userfield.entity);
  const values = await Promise.all((objects || []).map(async (object) => ({ object, values: await client.getObjectUserfields(userfield.entity, object.id) })));
  const plan = buildUserfieldDeletePlan({ options, userfield, values });
  const result = await client.deleteUserfield(userfield.id);
  return JSON.stringify({ action: 'deleted', entity: 'userfields', userfield: plan.userfield, checks: plan.checks, result }, null, 2);
}

function buildUserfieldDeletePlan({ options, userfield, values = [] }) {
  const confirmName = normalizeText(options['confirm-field-name']);
  if (!confirmName) throw new Error('Missing required option: --confirm-field-name');
  if (confirmName !== userfield.name) throw new Error(`--confirm-field-name does not match custom field ${userfield.id}:${userfield.name}`);
  const populatedObjects = findPopulatedObjects(userfield.name, values);
  const allowValues = parseOptionalFlag(options['delete-values'], '--delete-values') === 1;
  if (populatedObjects.length > 0 && !allowValues) {
    throw new Error(`Refusing to delete custom field ${userfield.id}:${userfield.name} because ${populatedObjects.length} object(s) have values. Populated object ids: ${populatedObjects.join(', ')}. Clear those values first, or rerun only after explicit confirmation with --delete-values true.`);
  }
  return { userfield: summarizeUserfield(userfield), checks: { inspected_objects: values.length, populated_object_ids: populatedObjects, values_deletion_confirmed: allowValues } };
}

function findPopulatedObjects(fieldName, values) {
  return values.filter(({ values: objectValues }) => hasValue(objectValues?.[fieldName])).map(({ object }) => object.id);
}

function hasValue(value) {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

module.exports = { buildUserfieldDeletePlan, findPopulatedObjects, hasValue, runUserfieldsDeleteCommand };
