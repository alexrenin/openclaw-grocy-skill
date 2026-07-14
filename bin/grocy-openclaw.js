#!/usr/bin/env node

'use strict';

const { createGrocyClientFromEnv } = require('../src/grocy-client');
const { loadEnvWithDotEnvFallback } = require('../src/env');
const { runApiDocsCommand } = require('../src/commands/api-docs');
const { runLocationsCommand } = require('../src/commands/locations');
const { runProductCreateCommand } = require('../src/commands/product-create');
const { runProductDeleteCommand } = require('../src/commands/product-delete');
const { runProductSearchCommand } = require('../src/commands/product-search');
const { runProductUpdateCommand } = require('../src/commands/product-update');
const { runProductsCommand } = require('../src/commands/products');
const { runRecipeCreateCommand } = require('../src/commands/recipe-create');
const { runRecipeDeleteCommand } = require('../src/commands/recipe-delete');
const { runRecipeIngredientAddCommand } = require('../src/commands/recipe-ingredient-add');
const { runRecipeIngredientDeleteCommand } = require('../src/commands/recipe-ingredient-delete');
const { runRecipeIngredientUpdateCommand } = require('../src/commands/recipe-ingredient-update');
const { runRecipeUpdateCommand } = require('../src/commands/recipe-update');
const { runShoppingListCommand } = require('../src/commands/shopping-list');
const { runStockAddCommand } = require('../src/commands/stock-add');
const { runStockTransactionUndoCommand } = require('../src/commands/stock-transaction-undo');
const { runStockCommand } = require('../src/commands/stock');
const { runSystemInfoCommand } = require('../src/commands/system-info');
const { runUnitCreateCommand } = require('../src/commands/unit-create');
const { runUnitDeleteCommand } = require('../src/commands/unit-delete');
const { runUnitUpdateCommand } = require('../src/commands/unit-update');
const { runUnitsCommand } = require('../src/commands/units');
const { runUserfieldsCommand } = require('../src/commands/userfields');
const { runUserfieldsCreateCommand } = require('../src/commands/userfields-create');
const { runUserfieldsGetCommand } = require('../src/commands/userfields-get');
const { runUserfieldsSetCommand } = require('../src/commands/userfields-set');

const HELP = `Usage:
  node bin/grocy-openclaw.js <command> --format <format>

Commands:
  api-docs        Show Grocy OpenAPI documentation links for the installed version
  system-info      Read Grocy system info
  locations        Read Grocy locations
  units            Read Grocy quantity units
  unit-create      Create a Grocy quantity unit
  unit-update      Update a Grocy quantity unit
  unit-delete      Safely delete an unused Grocy quantity unit
  shopping-list    Read Grocy shopping list
  products         Read Grocy products
  product-search   Search Grocy products by name
  product-create   Create a Grocy product
  product-update   Update a Grocy product
  product-delete   Safely delete a Grocy product when unused
  recipe-create    Create a Grocy recipe with ingredients
  recipe-update    Update a Grocy recipe
  recipe-delete    Delete a Grocy recipe
  recipe-ingredient-add
                   Add an ingredient to an existing Grocy recipe
  recipe-ingredient-update
                   Update an ingredient row in an existing Grocy recipe
  recipe-ingredient-delete
                   Delete an ingredient row from an existing Grocy recipe
  userfields       Read configured custom fields for an entity
  userfields-create
                   Create a custom field for an entity
  userfields-get   Read custom field values of one object
  userfields-set   Set custom field values of one object
  stock            Read Grocy stock
  stock-add        Add a purchased product amount to Grocy stock
  stock-transaction-undo
                   Undo a Grocy stock transaction

Formats:
  api-docs        text, json
  system-info      json
  locations        table, json
  units            table, json
  unit-create      json
  unit-update      json
  unit-delete      json
  shopping-list    text, json
  products         table, json
  product-search   table, json
  product-create   json
  product-update   json
  product-delete   json
  recipe-create    json
  recipe-update    json
  recipe-delete    json
  recipe-ingredient-add
                   json
  recipe-ingredient-update
                   json
  recipe-ingredient-delete
                   json
  userfields       table, json
  userfields-create
                   json
  userfields-get   table, json
  userfields-set   json
  stock            table, json
  stock-add        json
  stock-transaction-undo
                   json

Examples:
  node bin/grocy-openclaw.js api-docs --format text
  node bin/grocy-openclaw.js system-info --format json
  node bin/grocy-openclaw.js locations --format table
  node bin/grocy-openclaw.js units --format table
  node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
  node bin/grocy-openclaw.js unit-update --unit-id 7 --name "jar" --name-plural "jars" --format json
  node bin/grocy-openclaw.js unit-delete --unit-id 7 --confirm-unit-name "jar" --format json
  node bin/grocy-openclaw.js shopping-list --format text
  node bin/grocy-openclaw.js products --format table
  node bin/grocy-openclaw.js product-search --name "Milk" --format table
  node bin/grocy-openclaw.js product-create --name "Pickles" --location "Pantry" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --format json
  node bin/grocy-openclaw.js product-update --product-id 42 --name "Milk 2.5%" --active true --format json
  node bin/grocy-openclaw.js product-delete --product-id 42 --confirm-product-name "Milk 2.5%" --format json
  node bin/grocy-openclaw.js recipe-create --name "Salad" --ingredients '[{"name":"Pickles","amount":3,"unit":"шт"}]' --format json
  node bin/grocy-openclaw.js recipe-update --recipe "Salad" --name "Potato salad" --base-servings 4 --format json
  node bin/grocy-openclaw.js recipe-delete --recipe-id 11 --confirm-recipe-name "Potato salad" --delete-ingredients true --format json
  node bin/grocy-openclaw.js recipe-ingredient-add --recipe "Pancakes" --product "Sunflower oil" --amount 2 --unit "tbsp" --format json
  node bin/grocy-openclaw.js recipe-ingredient-update --recipe "Pancakes" --product "Sunflower oil" --amount 0.03 --unit "л" --format json
  node bin/grocy-openclaw.js recipe-ingredient-delete --position-id 12 --format json
  node bin/grocy-openclaw.js userfields --entity recipes --format table
  node bin/grocy-openclaw.js userfields-create --entity recipes --caption "Время готовки" --type text-single-line --format json
  node bin/grocy-openclaw.js userfields-get --entity recipes --object-id 10 --format json
  node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Pancakes" --values '{"difficulty":"easy","cook_time":"10 minutes"}' --format json
  node bin/grocy-openclaw.js stock --format json
  node bin/grocy-openclaw.js stock-add --product "Milk" --amount 1 --unit "l" --price 2.49 --format json
  node bin/grocy-openclaw.js stock-transaction-undo --transaction-id "abc123" --format json
`;

const COMMAND_FORMATS = new Map([
  ['api-docs', new Set(['text', 'json'])],
  ['system-info', new Set(['json'])],
  ['locations', new Set(['table', 'json'])],
  ['units', new Set(['table', 'json'])],
  ['unit-create', new Set(['json'])],
  ['unit-update', new Set(['json'])],
  ['unit-delete', new Set(['json'])],
  ['shopping-list', new Set(['text', 'json'])],
  ['products', new Set(['table', 'json'])],
  ['product-search', new Set(['table', 'json'])],
  ['product-create', new Set(['json'])],
  ['product-update', new Set(['json'])],
  ['product-delete', new Set(['json'])],
  ['recipe-create', new Set(['json'])],
  ['recipe-update', new Set(['json'])],
  ['recipe-delete', new Set(['json'])],
  ['recipe-ingredient-add', new Set(['json'])],
  ['recipe-ingredient-update', new Set(['json'])],
  ['recipe-ingredient-delete', new Set(['json'])],
  ['userfields', new Set(['table', 'json'])],
  ['userfields-create', new Set(['json'])],
  ['userfields-get', new Set(['table', 'json'])],
  ['userfields-set', new Set(['json'])],
  ['stock', new Set(['table', 'json'])],
  ['stock-add', new Set(['json'])],
  ['stock-transaction-undo', new Set(['json'])],
]);

const COMMAND_OPTIONS = new Map([
  ['product-search', new Set([
    'name',
  ])],
  ['product-create', new Set([
    'name',
    'description',
    'location',
    'location-id',
    'stock-unit',
    'stock-unit-id',
    'purchase-unit',
    'purchase-unit-id',
    'purchase-to-stock-factor',
    'consume-unit',
    'consume-unit-id',
    'consume-to-stock-factor',
  ])],
  ['product-update', new Set([
    'product',
    'product-id',
    'name',
    'description',
    'active',
    'location',
    'location-id',
    'stock-unit',
    'stock-unit-id',
    'purchase-unit',
    'purchase-unit-id',
    'purchase-to-stock-factor',
    'consume-unit',
    'consume-unit-id',
    'consume-to-stock-factor',
  ])],
  ['product-delete', new Set([
    'product-id',
    'confirm-product-name',
  ])],
  ['unit-create', new Set([
    'name',
    'name-plural',
    'description',
  ])],
  ['unit-update', new Set([
    'unit',
    'unit-id',
    'name',
    'name-plural',
    'description',
  ])],
  ['unit-delete', new Set([
    'unit-id',
    'confirm-unit-name',
  ])],
  ['recipe-create', new Set([
    'name',
    'description',
    'base-servings',
    'desired-servings',
    'ingredients',
    'create-missing-products',
  ])],
  ['recipe-update', new Set([
    'recipe',
    'recipe-id',
    'name',
    'description',
    'base-servings',
    'desired-servings',
  ])],
  ['recipe-delete', new Set([
    'recipe',
    'recipe-id',
    'confirm-recipe-name',
    'delete-ingredients',
  ])],
  ['recipe-ingredient-add', new Set([
    'recipe',
    'recipe-id',
    'product',
    'product-id',
    'name',
    'amount',
    'unit',
    'note',
    'ingredient-group',
    'variable-amount',
    'only-check-single-unit-in-stock',
    'round-up',
    'product-description',
    'location',
    'location-id',
    'stock-unit',
    'purchase-unit',
    'purchase-to-stock-factor',
    'consume-unit',
    'consume-to-stock-factor',
    'create-missing-products',
  ])],
  ['recipe-ingredient-update', new Set([
    'position-id',
    'recipe',
    'recipe-id',
    'product',
    'product-id',
    'name',
    'amount',
    'unit',
    'note',
    'ingredient-group',
    'variable-amount',
    'only-check-single-unit-in-stock',
    'round-up',
  ])],
  ['recipe-ingredient-delete', new Set([
    'position-id',
    'recipe',
    'recipe-id',
    'product',
    'product-id',
    'name',
  ])],
  ['userfields', new Set([
    'entity',
  ])],
  ['userfields-create', new Set([
    'entity',
    'name',
    'caption',
    'type',
    'show-as-column',
    'input-required',
    'sort-number',
    'config',
    'default-value',
  ])],
  ['userfields-get', new Set([
    'entity',
    'object-id',
  ])],
  ['userfields-set', new Set([
    'entity',
    'object-id',
    'object-name',
    'values',
    'field',
    'value',
  ])],
  ['stock-add', new Set([
    'product',
    'product-id',
    'name',
    'amount',
    'unit',
    'unit-id',
    'price',
    'best-before-date',
    'transaction-type',
  ])],
  ['stock-transaction-undo', new Set([
    'transaction-id',
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

  const client = createGrocyClientFromEnv(loadEnvWithDotEnvFallback(env));
  let output;

  switch (command) {
    case 'api-docs':
      output = await runApiDocsCommand({ client, format });
      break;
    case 'system-info':
      output = await runSystemInfoCommand({ client, format });
      break;
    case 'locations':
      output = await runLocationsCommand({ client, format });
      break;
    case 'units':
      output = await runUnitsCommand({ client, format });
      break;
    case 'unit-create':
      output = await runUnitCreateCommand({ client, format, options });
      break;
    case 'unit-update':
      output = await runUnitUpdateCommand({ client, format, options });
      break;
    case 'unit-delete':
      output = await runUnitDeleteCommand({ client, format, options });
      break;
    case 'shopping-list':
      output = await runShoppingListCommand({ client, format });
      break;
    case 'products':
      output = await runProductsCommand({ client, format });
      break;
    case 'product-search':
      output = await runProductSearchCommand({ client, format, options });
      break;
    case 'product-create':
      output = await runProductCreateCommand({ client, format, options });
      break;
    case 'product-update':
      output = await runProductUpdateCommand({ client, format, options });
      break;
    case 'product-delete':
      output = await runProductDeleteCommand({ client, format, options });
      break;
    case 'recipe-create':
      output = await runRecipeCreateCommand({ client, format, options });
      break;
    case 'recipe-update':
      output = await runRecipeUpdateCommand({ client, format, options });
      break;
    case 'recipe-delete':
      output = await runRecipeDeleteCommand({ client, format, options });
      break;
    case 'recipe-ingredient-add':
      output = await runRecipeIngredientAddCommand({ client, format, options });
      break;
    case 'recipe-ingredient-update':
      output = await runRecipeIngredientUpdateCommand({ client, format, options });
      break;
    case 'recipe-ingredient-delete':
      output = await runRecipeIngredientDeleteCommand({ client, format, options });
      break;
    case 'userfields':
      output = await runUserfieldsCommand({ client, format, options });
      break;
    case 'userfields-create':
      output = await runUserfieldsCreateCommand({ client, format, options });
      break;
    case 'userfields-get':
      output = await runUserfieldsGetCommand({ client, format, options });
      break;
    case 'userfields-set':
      output = await runUserfieldsSetCommand({ client, format, options });
      break;
    case 'stock':
      output = await runStockCommand({ client, format });
      break;
    case 'stock-add':
      output = await runStockAddCommand({ client, format, options });
      break;
    case 'stock-transaction-undo':
      output = await runStockTransactionUndoCommand({ client, format, options });
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
