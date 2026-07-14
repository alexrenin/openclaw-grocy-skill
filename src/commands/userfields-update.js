'use strict';

const { parsePositiveInteger } = require('./product-create');
const { parseEntity } = require('./userfields');
const { normalizeText, parseOptionalFlag, parseOptionalInteger, parseUserfieldName, parseUserfieldType } = require('./userfields-create');

async function runUserfieldsUpdateCommand({ client, format, options }) {
  if (format !== 'json') throw new Error(`Unsupported format for userfields-update: ${format}`);
  const plan = buildUserfieldUpdatePlan({ options, definitions: await client.getUserfields() });
  const result = await client.updateUserfield(plan.userfield.id, plan.payload);
  return JSON.stringify({ action: 'updated', entity: 'userfields', userfield: plan.userfield, payload: plan.payload, result }, null, 2);
}

function buildUserfieldUpdatePlan({ options, definitions }) {
  const userfield = resolveUserfieldSelector(options, definitions);
  const payload = pickEditableUserfieldFields(userfield);
  const setters = new Map([
    ['name', (value) => parseUserfieldName(value)],
    ['caption', (value) => requireText(value, '--caption')],
    ['type', (value) => parseUserfieldType(value)],
    ['show-as-column', (value) => parseOptionalFlag(value, '--show-as-column')],
    ['input-required', (value) => parseOptionalFlag(value, '--input-required')],
    ['sort-number', (value) => parseOptionalInteger(value, '--sort-number')],
    ['config', (value) => normalizeText(value)],
    ['default-value', (value) => normalizeText(value)],
  ]);
  const payloadNames = new Map([['show-as-column', 'show_as_column_in_tables'], ['input-required', 'input_required'], ['sort-number', 'sort_number'], ['default-value', 'default_value']]);
  let changed = false;
  for (const [option, parse] of setters) {
    if (Object.hasOwn(options, option)) {
      payload[payloadNames.get(option) || option] = parse(options[option]);
      changed = true;
    }
  }
  if (!changed) throw new Error('At least one custom field property must be provided.');
  return { userfield: summarizeUserfield(userfield), payload };
}

function resolveUserfieldSelector(options, definitions = []) {
  const idValue = options['userfield-id'];
  const fieldValue = normalizeText(options.field);
  if (idValue && fieldValue) throw new Error('Specify either --userfield-id or --field, not both.');
  if (idValue) {
    const id = parsePositiveInteger(idValue, '--userfield-id');
    const match = definitions.find((field) => Number(field.id) === id);
    if (!match) throw new Error(`Unknown custom field id: ${id}.`);
    return match;
  }
  if (!fieldValue) throw new Error('Missing required option: --userfield-id or --field');
  const entity = parseEntity(options.entity);
  const normalized = fieldValue.toLocaleLowerCase();
  const matches = definitions.filter((field) => field.entity === entity && [field.name, field.caption]
    .some((value) => normalizeText(value).toLocaleLowerCase() === normalized));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Ambiguous custom field: ${fieldValue}. Use --userfield-id.`);
  throw new Error(`Unknown custom field for ${entity}: ${fieldValue}.`);
}

function pickEditableUserfieldFields(field) {
  const result = {};
  for (const name of ['entity', 'name', 'caption', 'type', 'show_as_column_in_tables', 'input_required', 'sort_number', 'config', 'default_value']) {
    if (Object.hasOwn(field, name)) result[name] = field[name];
  }
  return result;
}

function summarizeUserfield(field) {
  return { id: Number(field.id), entity: field.entity, name: field.name || '', caption: field.caption || '' };
}

function requireText(value, optionName) {
  const result = normalizeText(value);
  if (!result) throw new Error(`${optionName} must not be empty`);
  return result;
}

module.exports = { buildUserfieldUpdatePlan, pickEditableUserfieldFields, resolveUserfieldSelector, runUserfieldsUpdateCommand, summarizeUserfield };
