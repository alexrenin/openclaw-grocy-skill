'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildUserfieldDeletePlan, findPopulatedObjects, runUserfieldsDeleteCommand } = require('../src/commands/userfields-delete');

const field = { id: 14, entity: 'recipes', name: 'cook_time', caption: 'Cook time' };
const values = [{ object: { id: 1 }, values: { cook_time: '' } }, { object: { id: 2 }, values: { cook_time: '30 min' } }];

test('finds objects with populated custom field values', () => {
  assert.deepEqual(findPopulatedObjects('cook_time', values), [2]);
});

test('refuses deletion when values would be lost without explicit confirmation', () => {
  assert.throws(() => buildUserfieldDeletePlan({ options: { 'confirm-field-name': 'cook_time' }, userfield: field, values }), /--delete-values true/);
  assert.throws(() => buildUserfieldDeletePlan({ options: { 'confirm-field-name': 'wrong' }, userfield: field, values: [] }), /does not match/);
});

test('allows deletion of an unused field', () => {
  const plan = buildUserfieldDeletePlan({ options: { 'confirm-field-name': 'cook_time' }, userfield: field, values: values.slice(0, 1) });
  assert.deepEqual(plan.checks.populated_object_ids, []);
});

test('runs userfields-delete after inspecting values', async () => {
  let deletedId;
  const output = await runUserfieldsDeleteCommand({ format: 'json', options: { 'userfield-id': '14', 'confirm-field-name': 'cook_time', 'delete-values': 'true' }, client: { getUserfields: async () => [field], getObjects: async () => [{ id: 2 }], getObjectUserfields: async () => ({ cook_time: '30 min' }), deleteUserfield: async (id) => { deletedId = id; return null; } } });
  assert.equal(deletedId, 14);
  assert.deepEqual(JSON.parse(output).checks.populated_object_ids, [2]);
});
