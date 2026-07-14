'use strict';

async function runProductCreateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for product-create: ${format}`);
  }

  const quantityUnits = await client.getQuantityUnits();
  const payload = buildProductPayload(options, quantityUnits);
  const result = await client.createProduct(payload);

  return JSON.stringify({
    action: 'created',
    entity: 'products',
    payload,
    result,
  }, null, 2);
}

function buildProductPayload(options, quantityUnits) {
  const name = normalizeText(options.name);

  if (!name) {
    throw new Error('Missing required option: --name');
  }

  const quIdStock = resolveUnitOption({
    label: 'stock unit',
    idValue: options['stock-unit-id'],
    nameValue: options['stock-unit'],
    quantityUnits,
    required: true,
  });
  const quIdPurchase = resolveUnitOption({
    label: 'purchase unit',
    idValue: options['purchase-unit-id'],
    nameValue: options['purchase-unit'],
    quantityUnits,
    required: false,
  }) ?? quIdStock;
  const quIdConsume = resolveUnitOption({
    label: 'consume unit',
    idValue: options['consume-unit-id'],
    nameValue: options['consume-unit'],
    quantityUnits,
    required: false,
  }) ?? quIdStock;

  const payload = {
    name,
    qu_id_stock: quIdStock,
    qu_id_purchase: quIdPurchase,
    qu_id_consume: quIdConsume,
  };

  const description = normalizeText(options.description);

  if (description) {
    payload.description = description;
  }

  return payload;
}

function resolveUnitOption({ label, idValue, nameValue, quantityUnits, required }) {
  if (idValue && nameValue) {
    throw new Error(`Specify either --${label.replace(' ', '-')}-id or --${label.replace(' ', '-')}, not both.`);
  }

  if (idValue) {
    return parsePositiveInteger(idValue, `--${label.replace(' ', '-')}-id`);
  }

  if (nameValue) {
    const unit = findQuantityUnit(nameValue, quantityUnits);

    if (!unit) {
      throw new Error(`Unknown ${label}: ${nameValue}`);
    }

    return Number(unit.id);
  }

  if (required) {
    throw new Error(`Missing required option: --${label.replace(' ', '-')} or --${label.replace(' ', '-')}-id`);
  }

  return undefined;
}

function findQuantityUnit(value, quantityUnits) {
  const normalized = normalizeText(value).toLowerCase();
  const numericId = Number(value);

  if (Number.isInteger(numericId) && numericId > 0) {
    return quantityUnits.find((unit) => Number(unit.id) === numericId);
  }

  return quantityUnits.find((unit) => {
    const names = [
      unit.name,
      unit.name_plural,
      unit.name_plural2,
    ].map((name) => normalizeText(name).toLowerCase());

    return names.includes(normalized);
  });
}

function parsePositiveInteger(value, optionName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }

  return numberValue;
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

module.exports = {
  buildProductPayload,
  findQuantityUnit,
  runProductCreateCommand,
};
