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
  const quFactorPurchaseToStock = resolveFactorOption({
    optionName: '--purchase-to-stock-factor',
    value: options['purchase-to-stock-factor'],
    sourceUnitId: quIdPurchase,
    stockUnitId: quIdStock,
  });
  const quFactorConsumeToStock = resolveFactorOption({
    optionName: '--consume-to-stock-factor',
    value: options['consume-to-stock-factor'],
    sourceUnitId: quIdConsume,
    stockUnitId: quIdStock,
  });

  const payload = {
    name,
    qu_id_stock: quIdStock,
    qu_id_purchase: quIdPurchase,
    qu_id_consume: quIdConsume,
    qu_factor_purchase_to_stock: quFactorPurchaseToStock,
    qu_factor_consume_to_stock: quFactorConsumeToStock,
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
    const unit = resolveQuantityUnit(nameValue, quantityUnits, label);

    return Number(unit.id);
  }

  if (required) {
    throw new Error(`Missing required option: --${label.replace(' ', '-')} or --${label.replace(' ', '-')}-id`);
  }

  return undefined;
}

function resolveFactorOption({ optionName, value, sourceUnitId, stockUnitId }) {
  const unitsDiffer = Number(sourceUnitId) !== Number(stockUnitId);

  if (value == null || value === '') {
    if (unitsDiffer) {
      throw new Error(formatMissingFactorError(optionName));
    }

    return 1;
  }

  return parsePositiveNumber(value, optionName);
}

function formatMissingFactorError(optionName) {
  if (optionName === '--purchase-to-stock-factor') {
    return [
      '--purchase-to-stock-factor is required when purchase unit differs from stock unit.',
      'Ask the user: "How many stock units are in 1 purchase unit?"',
      'Example: if 1 jar contains about 10 pieces, use --purchase-to-stock-factor 10.',
    ].join(' ');
  }

  if (optionName === '--consume-to-stock-factor') {
    return [
      '--consume-to-stock-factor is required when consume unit differs from stock unit.',
      'Ask the user: "How many stock units are in 1 consume unit?"',
      'Example: if 1 ml is 0.001 liters, use --consume-to-stock-factor 0.001.',
    ].join(' ');
  }

  return `${optionName} is required when the unit differs from stock unit.`;
}

function findQuantityUnit(value, quantityUnits) {
  const matches = findQuantityUnitMatches(value, quantityUnits);

  return matches.length === 1 ? matches[0] : undefined;
}

function resolveQuantityUnit(value, quantityUnits, label) {
  const matches = findQuantityUnitMatches(value, quantityUnits);

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous ${label}: ${value}. Matches: ${formatUnitChoices(matches)}`);
  }

  throw new Error(`Unknown ${label}: ${value}. Available units: ${formatUnitChoices(quantityUnits)}`);
}

function findQuantityUnitMatches(value, quantityUnits) {
  const normalized = normalizeUnitTerm(value);
  const numericId = Number(value);

  if (Number.isInteger(numericId) && numericId > 0) {
    return quantityUnits.filter((unit) => Number(unit.id) === numericId);
  }

  const wantedTerms = expandUnitAliases(normalized);
  const exactMatches = quantityUnits.filter((unit) => {
    const terms = getQuantityUnitTerms(unit);

    return terms.some((term) => wantedTerms.includes(term));
  });

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  if (normalized.length < 3) {
    return [];
  }

  return quantityUnits.filter((unit) => {
    const terms = getQuantityUnitTerms(unit);

    return terms.some((term) => term.includes(normalized) || normalized.includes(term));
  });
}

function getQuantityUnitTerms(unit) {
  return [
    unit.name,
    unit.name_plural,
    unit.name_plural2,
    unit.description,
  ]
    .map(normalizeUnitTerm)
    .filter(Boolean);
}

function expandUnitAliases(normalized) {
  const aliases = new Map([
    ['кг', ['кг', 'килограмм', 'килограмма', 'килограммов', 'кило', 'kg', 'kgs', 'kilogram', 'kilograms']],
    ['килограмм', ['кг', 'килограмм', 'килограмма', 'килограммов', 'кило', 'kg', 'kgs', 'kilogram', 'kilograms']],
    ['кило', ['кг', 'килограмм', 'килограмма', 'килограммов', 'кило', 'kg', 'kgs', 'kilogram', 'kilograms']],
    ['г', ['г', 'гр', 'грамм', 'грамма', 'граммов', 'g', 'gram', 'grams']],
    ['грамм', ['г', 'гр', 'грамм', 'грамма', 'граммов', 'g', 'gram', 'grams']],
    ['л', ['л', 'литр', 'литра', 'литров', 'l', 'liter', 'liters', 'litre', 'litres']],
    ['литр', ['л', 'литр', 'литра', 'литров', 'l', 'liter', 'liters', 'litre', 'litres']],
    ['мл', ['мл', 'миллилитр', 'миллилитра', 'миллилитров', 'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']],
    ['шт', ['шт', 'штука', 'штуки', 'штук', 'pc', 'pcs', 'piece', 'pieces']],
    ['штука', ['шт', 'штука', 'штуки', 'штук', 'pc', 'pcs', 'piece', 'pieces']],
    ['упаковка', ['упаковка', 'упаковки', 'упаковок', 'пачка', 'пачки', 'пачек', 'pack', 'packs', 'package', 'packages']],
    ['пачка', ['упаковка', 'упаковки', 'упаковок', 'пачка', 'пачки', 'пачек', 'pack', 'packs', 'package', 'packages']],
  ]);

  for (const terms of aliases.values()) {
    const normalizedTerms = terms.map(normalizeUnitTerm);

    if (normalizedTerms.includes(normalized)) {
      return normalizedTerms;
    }
  }

  return [normalized];
}

function formatUnitChoices(units) {
  if (!Array.isArray(units) || units.length === 0) {
    return 'none';
  }

  return units
    .map((unit) => {
      const name = normalizeText(unit.name) || 'unnamed';
      const plural = normalizeText(unit.name_plural);
      const suffix = plural && plural !== name ? `/${plural}` : '';

      return `${unit.id}:${name}${suffix}`;
    })
    .join(', ');
}

function parsePositiveInteger(value, optionName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }

  return numberValue;
}

function parsePositiveNumber(value, optionName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${optionName} must be a positive number`);
  }

  return numberValue;
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function normalizeUnitTerm(value) {
  return normalizeText(value)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  buildProductPayload,
  findQuantityUnit,
  findQuantityUnitMatches,
  formatUnitChoices,
  formatMissingFactorError,
  parsePositiveNumber,
  runProductCreateCommand,
};
