'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildUnitUpdatePlan,
  resolveUnitSelector,
  runUnitUpdateCommand,
} = require('../src/commands/unit-update');

const units = [
  {
    id: 7,
    name: 'jar',
    name_plural: 'jars',
    description: 'old',
  },
  {
    id: 8,
    name: 'bottle',
    name_plural: 'bottles',
  },
];

test('builds unit update payload by merging current unit fields', () => {
  const plan = buildUnitUpdatePlan({
    options: {
      unit: 'jar',
      name: 'glass jar',
      'name-plural': 'glass jars',
      description: '',
    },
    quantityUnits: units,
  });

  assert.deepEqual(plan.unit, {
    id: 7,
    name: 'jar',
    name_plural: 'jars',
  });
  assert.deepEqual(plan.payload, {
    id: 7,
    name: 'glass jar',
    name_plural: 'glass jars',
    description: '',
  });
});

test('rejects unit update without changes', () => {
  assert.throws(
    () => buildUnitUpdatePlan({
      options: {
        'unit-id': '7',
      },
      quantityUnits: units,
    }),
    /At least one quantity unit field must be provided/,
  );
});

test('rejects empty unit update name fields', () => {
  assert.throws(
    () => buildUnitUpdatePlan({
      options: {
        'unit-id': '7',
        name: ' ',
      },
      quantityUnits: units,
    }),
    /--name must not be empty/,
  );
  assert.throws(
    () => buildUnitUpdatePlan({
      options: {
        'unit-id': '7',
        'name-plural': '',
      },
      quantityUnits: units,
    }),
    /--name-plural must not be empty/,
  );
});

test('resolves unit selector by id or name', () => {
  assert.equal(resolveUnitSelector({
    idValue: '7',
    quantityUnits: units,
  }).name, 'jar');
  assert.equal(resolveUnitSelector({
    nameValue: 'bottle',
    quantityUnits: units,
  }).id, 8);
});

test('rejects invalid unit selector', () => {
  assert.throws(
    () => resolveUnitSelector({
      idValue: '7',
      nameValue: 'jar',
      quantityUnits: units,
    }),
    /Specify either --unit-id or --unit, not both/,
  );
  assert.throws(
    () => resolveUnitSelector({
      nameValue: 'unknown',
      quantityUnits: units,
    }),
    /Unknown quantity unit: unknown/,
  );
});

test('runs unit-update json command', async () => {
  let updatedUnitId;
  let updatedPayload;

  const output = await runUnitUpdateCommand({
    format: 'json',
    options: {
      'unit-id': '7',
      name: 'glass jar',
    },
    client: {
      getQuantityUnits: async () => units,
      updateQuantityUnit: async (unitId, payload) => {
        updatedUnitId = unitId;
        updatedPayload = payload;
        return null;
      },
    },
  });

  assert.equal(updatedUnitId, 7);
  assert.equal(updatedPayload.name, 'glass jar');
  assert.equal(output, JSON.stringify({
    action: 'updated',
    entity: 'quantity_units',
    unit: {
      id: 7,
      name: 'jar',
      name_plural: 'jars',
    },
    payload: updatedPayload,
    result: null,
  }, null, 2));
});
