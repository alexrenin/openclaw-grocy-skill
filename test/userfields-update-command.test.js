'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildUserfieldUpdatePlan, runUserfieldsUpdateCommand } = require('../src/commands/userfields-update');

const field = { id: 14, entity: 'recipes', name: 'cook_time', caption: 'Cook time', type: 'text-single-line', show_as_column_in_tables: 0, input_required: 0, sort_number: 10, row_created_timestamp: 'ignored' };

test('builds a userfield update payload from editable fields only', () => {
  const plan = buildUserfieldUpdatePlan({ options: { entity: 'recipes', field: 'Cook time', caption: 'Cooking time', type: 'integer', 'show-as-column': 'true', config: '' }, definitions: [field] });
  assert.deepEqual(plan.payload, { entity: 'recipes', name: 'cook_time', caption: 'Cooking time', type: 'number-integral', show_as_column_in_tables: 1, input_required: 0, sort_number: 10, config: '' });
  assert.equal(plan.userfield.id, 14);
});

test('requires an update property and unambiguous selector', () => {
  assert.throws(() => buildUserfieldUpdatePlan({ options: { 'userfield-id': '14' }, definitions: [field] }), /At least one/);
  assert.throws(() => buildUserfieldUpdatePlan({ options: { entity: 'recipes', field: 'missing', caption: 'X' }, definitions: [field] }), /Unknown custom field/);
});

test('runs userfields-update json command', async () => {
  let updated;
  const output = await runUserfieldsUpdateCommand({ format: 'json', options: { 'userfield-id': '14', caption: 'Cooking time' }, client: { getUserfields: async () => [field], updateUserfield: async (id, payload) => { updated = { id, payload }; return null; } } });
  assert.equal(updated.id, 14);
  assert.equal(updated.payload.caption, 'Cooking time');
  assert.equal(JSON.parse(output).action, 'updated');
});
