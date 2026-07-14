#!/usr/bin/env node

'use strict';

const { createGrocyClientFromEnv } = require('../src/grocy-client');
const { runProductCreateCommand } = require('../src/commands/product-create');
const { runProductsCommand } = require('../src/commands/products');
const { runShoppingListCommand } = require('../src/commands/shopping-list');
const { runStockCommand } = require('../src/commands/stock');
const { runSystemInfoCommand } = require('../src/commands/system-info');
const { runUnitCreateCommand } = require('../src/commands/unit-create');
const { runUnitsCommand } = require('../src/commands/units');

const HELP = `Usage:
  node bin/grocy-openclaw.js <command> --format <format>

Commands:
  system-info      Read Grocy system info
  units            Read Grocy quantity units
  unit-create      Create a Grocy quantity unit
  shopping-list    Read Grocy shopping list
  products         Read Grocy products
  product-create   Create a Grocy product
  stock            Read Grocy stock

Formats:
  system-info      json
  units            table, json
  unit-create      json
  shopping-list    text, json
  products         table, json
  product-create   json
  stock            table, json

Examples:
  node bin/grocy-openclaw.js system-info --format json
  node bin/grocy-openclaw.js units --format table
  node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
  node bin/grocy-openclaw.js shopping-list --format text
  node bin/grocy-openclaw.js products --format table
  node bin/grocy-openclaw.js product-create --name "Pickles" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --format json
  node bin/grocy-openclaw.js stock --format json
`;

const COMMAND_FORMATS = new Map([
  ['system-info', new Set(['json'])],
  ['units', new Set(['table', 'json'])],
  ['unit-create', new Set(['json'])],
  ['shopping-list', new Set(['text', 'json'])],
  ['products', new Set(['table', 'json'])],
  ['product-create', new Set(['json'])],
  ['stock', new Set(['table', 'json'])],
]);

const COMMAND_OPTIONS = new Map([
  ['product-create', new Set([
    'name',
    'description',
    'stock-unit',
    'stock-unit-id',
    'purchase-unit',
    'purchase-unit-id',
    'purchase-to-stock-factor',
    'consume-unit',
    'consume-unit-id',
    'consume-to-stock-factor',
  ])],
  ['unit-create', new Set([
    'name',
    'name-plural',
    'description',
  ])],
]);

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0];
  let format;
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const [rawName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    const value = inlineValue === undefined ? args[index + 1] : inlineValue;

    if (!rawName) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    if (value === undefined || (inlineValue === undefined && value.startsWith('--'))) {
      throw new Error(`Missing value for --${rawName}`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    if (rawName === 'format') {
      format = value;
      continue;
    }

    options[rawName] = value;
  }

  return { command, format, options };
}

function printHelp() {
  process.stdout.write(HELP);
}

async function main(argv, env = process.env) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return 0;
  }

  const { command, format, options } = parseArgs(argv);
  const allowedFormats = COMMAND_FORMATS.get(command);

  if (!allowedFormats) {
    throw new Error(`Unknown command: ${command}`);
  }

  if (!format) {
    throw new Error(`Missing --format. Supported formats: ${[...allowedFormats].join(', ')}`);
  }

  if (!allowedFormats.has(format)) {
    throw new Error(`Unsupported format for ${command}: ${format}`);
  }

  validateOptions(command, options);

  const client = createGrocyClientFromEnv(env);
  let output;

  switch (command) {
    case 'system-info':
      output = await runSystemInfoCommand({ client, format });
      break;
    case 'units':
      output = await runUnitsCommand({ client, format });
      break;
    case 'unit-create':
      output = await runUnitCreateCommand({ client, format, options });
      break;
    case 'shopping-list':
      output = await runShoppingListCommand({ client, format });
      break;
    case 'products':
      output = await runProductsCommand({ client, format });
      break;
    case 'product-create':
      output = await runProductCreateCommand({ client, format, options });
      break;
    case 'stock':
      output = await runStockCommand({ client, format });
      break;
    default:
      throw new Error(`${command} command is not implemented yet.`);
  }

  if (output) {
    process.stdout.write(`${output}\n`);
  }

  return 0;
}

function validateOptions(command, options) {
  const allowedOptions = COMMAND_OPTIONS.get(command) || new Set();

  for (const option of Object.keys(options)) {
    if (!allowedOptions.has(option)) {
      throw new Error(`Unsupported option for ${command}: --${option}`);
    }
  }
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      process.stderr.write(`Error: ${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  main,
  parseArgs,
  validateOptions,
};
