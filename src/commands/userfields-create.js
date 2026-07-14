'use strict';

const { parseEntity } = require('./userfields');

const USERFIELD_TYPES = new Set([
  'checkbox',
  'date',
  'datetime',
  'file',
  'image',
  'link',
  'link-with-title',
  'number-currency',
  'number-decimal',
  'number-integral',
  'preset-checklist',
  'preset-list',
  'text-multi-line',
  'text-single-line',
]);

const TYPE_ALIASES = new Map([
  ['bool', 'checkbox'],
  ['boolean', 'checkbox'],
  ['currency', 'number-currency'],
  ['decimal', 'number-decimal'],
  ['integer', 'number-integral'],
  ['int', 'number-integral'],
  ['multi-select', 'preset-checklist'],
  ['multiselect', 'preset-checklist'],
  ['number', 'number-decimal'],
  ['select', 'preset-list'],
  ['text', 'text-single-line'],
  ['textarea', 'text-multi-line'],
  ['url', 'link'],
]);

async function runUserfieldsCreateCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for userfields-create: ${format}`);
  }

  const payload = buildUserfieldPayload(options);
  const result = await client.createUserfield(payload);

  return JSON.stringify({
    action: 'created',
    entity: 'userfields',
    payload,
    result,
  }, null, 2);
}

function buildUserfieldPayload(options) {
  const entity = parseEntity(options.entity);
  const caption = normalizeText(options.caption);

  if (!caption) {
    throw new Error('Missing required option: --caption');
  }

  const payload = {
    entity,
    name: parseUserfieldName(options.name || slugifyCaption(caption)),
    caption,
    type: parseUserfieldType(options.type),
  };
  const showAsColumn = parseOptionalFlag(options['show-as-column'], '--show-as-column');
  const inputRequired = parseOptionalFlag(options['input-required'], '--input-required');
  const sortNumber = parseOptionalInteger(options['sort-number'], '--sort-number');
  const config = normalizeText(options.config);
  const defaultValue = normalizeText(options['default-value']);

  if (showAsColumn !== undefined) {
    payload.show_as_column_in_tables = showAsColumn;
  }

  if (inputRequired !== undefined) {
    payload.input_required = inputRequired;
  }

  if (sortNumber !== undefined) {
    payload.sort_number = sortNumber;
  }

  if (config) {
    payload.config = config;
  }

  if (defaultValue) {
    payload.default_value = defaultValue;
  }

  return payload;
}

function parseUserfieldType(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    throw new Error(`Missing required option: --type. Supported types: ${formatSupportedTypes()}`);
  }

  const type = TYPE_ALIASES.get(normalized) || normalized;

  if (!USERFIELD_TYPES.has(type)) {
    throw new Error(`Unsupported userfield type: ${value}. Supported types: ${formatSupportedTypes()}`);
  }

  return type;
}

function parseUserfieldName(value) {
  const name = normalizeText(value);

  if (!name) {
    throw new Error('Missing required option: --name or a caption that can be converted to a technical name');
  }

  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error('--name must contain only letters, digits, and underscores');
  }

  return name;
}

function slugifyCaption(value) {
  const transliterated = normalizeText(value)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .split('')
    .map((char) => CYRILLIC_TO_LATIN.get(char) || char)
    .join('');

  return transliterated
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function parseOptionalFlag(value, optionName) {
  if (value == null || value === '') {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return 1;
  }

  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return 0;
  }

  throw new Error(`${optionName} must be true/false or 1/0`);
}

function parseOptionalInteger(value, optionName) {
  if (value == null || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${optionName} must be a non-negative integer`);
  }

  return numberValue;
}

function formatSupportedTypes() {
  return [...USERFIELD_TYPES].sort().join(', ');
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

const CYRILLIC_TO_LATIN = new Map(Object.entries({
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}));

module.exports = {
  buildUserfieldPayload,
  formatSupportedTypes,
  parseUserfieldName,
  parseUserfieldType,
  runUserfieldsCreateCommand,
  slugifyCaption,
};
