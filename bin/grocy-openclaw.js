#!/usr/bin/env node

'use strict';

const { createGrocyClientFromEnv } = require('../src/grocy-client');
const { loadEnvWithDotEnvFallback } = require('../src/env');
const { runApiDocsCommand } = require('../src/commands/api-docs');
const { runLocationsCommand } = require('../src/commands/locations');
const { runMenuCheckCommand } = require('../src/commands/menu-check');
const { runMenuPlanCommand } = require('../src/commands/menu-plan');
const { runMenuShoppingListCommand } = require('../src/commands/menu-shopping-list');
const { runMealPlanCommand } = require('../src/commands/meal-plan');
const { runMealPlanAddCommand } = require('../src/commands/meal-plan-add');
const { runMealPlanDeleteCommand } = require('../src/commands/meal-plan-delete');
const { runMealPlanUpdateCommand } = require('../src/commands/meal-plan-update');
const { runProductCreateCommand } = require('../src/commands/product-create');
const { runProductDeleteCommand } = require('../src/commands/product-delete');
const { runProductSearchCommand } = require('../src/commands/product-search');
const { runProductUpdateCommand } = require('../src/commands/product-update');
const { runProductsCommand } = require('../src/commands/products');
const { runRecipeGetCommand } = require('../src/commands/recipe-get');
const { runRecipeCreateCommand } = require('../src/commands/recipe-create');
const { runRecipeDeleteCommand } = require('../src/commands/recipe-delete');
const { runRecipeIngredientAddCommand } = require('../src/commands/recipe-ingredient-add');
const { runRecipeIngredientDeleteCommand } = require('../src/commands/recipe-ingredient-delete');
const { runRecipeIngredientUpdateCommand } = require('../src/commands/recipe-ingredient-update');
const { runRecipeUpdateCommand } = require('../src/commands/recipe-update');
const { runRecipesCommand } = require('../src/commands/recipes');
const { runShoppingListCommand } = require('../src/commands/shopping-list');
const { runShoppingListAddCommand } = require('../src/commands/shopping-list-add');
const { runShoppingListCleanCommand } = require('../src/commands/shopping-list-clean');
const { runShoppingListDeleteCommand } = require('../src/commands/shopping-list-delete');
const { runShoppingListDoneCommand } = require('../src/commands/shopping-list-done');
const { runShoppingListUpdateCommand } = require('../src/commands/shopping-list-update');
const { runStockAddCommand } = require('../src/commands/stock-add');
const { runStockExpiringCommand } = require('../src/commands/stock-expiring');
const { runStockLowCommand } = require('../src/commands/stock-low');
const { runStockSummaryCommand } = require('../src/commands/stock-summary');
const { runStockTransactionUndoCommand } = require('../src/commands/stock-transaction-undo');
const { runStockCommand } = require('../src/commands/stock');
const { runSystemInfoCommand } = require('../src/commands/system-info');
const { runUnitCreateCommand } = require('../src/commands/unit-create');
const { runUnitDeleteCommand } = require('../src/commands/unit-delete');
const { runUnitUpdateCommand } = require('../src/commands/unit-update');
const { runUnitsCommand } = require('../src/commands/units');
const { runUserfieldsCommand } = require('../src/commands/userfields');
const { runUserfieldsCreateCommand } = require('../src/commands/userfields-create');
const { runUserfieldsDeleteCommand } = require('../src/commands/userfields-delete');
const { runUserfieldsGetCommand } = require('../src/commands/userfields-get');
const { runUserfieldsSetCommand } = require('../src/commands/userfields-set');
const { runUserfieldsUpdateCommand } = require('../src/commands/userfields-update');

const HELP = `Usage:
  node bin/grocy-openclaw.js <command> --format <format>

Commands:
  api-docs        Show Grocy OpenAPI documentation links for the installed version
  system-info      Read Grocy system info
  locations        Read Grocy locations
  menu-check       Check selected recipes against current stock
  menu-plan        Recommend recipes for a read-only menu plan
  menu-shopping-list
                   Calculate missing products for selected recipes
  meal-plan        Read Grocy meal plan rows
  meal-plan-add    Add a recipe to the Grocy meal plan
  meal-plan-update
                   Update one Grocy meal plan row
  meal-plan-delete
                   Delete one Grocy meal plan row
  units            Read Grocy quantity units
  unit-create      Create a Grocy quantity unit
  unit-update      Update a Grocy quantity unit
  unit-delete      Safely delete an unused Grocy quantity unit
  shopping-list    Read Grocy shopping list
  shopping-list-add
                   Add an item to a Grocy shopping list
  shopping-list-update
                   Update one Grocy shopping list item
  shopping-list-delete
                   Delete one Grocy shopping list item
  shopping-list-done
                   Mark one Grocy shopping list item done or undone
  shopping-list-clean
                   Delete completed items from one Grocy shopping list
  products         Read Grocy products
  product-search   Search Grocy products by name
  product-create   Create a Grocy product
  product-update   Update a Grocy product
  product-delete   Safely delete a Grocy product when unused
  recipes          Read Grocy recipes
  recipe-get       Read one Grocy recipe with its ingredients
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
  userfields-update
                   Update a custom field definition
  userfields-delete
                   Safely delete a custom field definition
  userfields-get   Read custom field values of one object
  userfields-set   Set custom field values of one object
  stock            Read Grocy stock
  stock-expiring   Show due-soon, overdue, and expired stock
  stock-low        Show products below their configured minimum stock
  stock-summary    Show a compact Grocy stock monitoring summary
  stock-add        Add a purchased product amount to Grocy stock
  stock-transaction-undo
                   Undo a Grocy stock transaction

Formats:
  api-docs        text, json
  system-info      json
  locations        table, json
  menu-check       text, json
  menu-plan        text, json
  menu-shopping-list
                   text, json
  meal-plan        table, json
  meal-plan-add    json
  meal-plan-update
                   json
  meal-plan-delete
                   json
  units            table, json
  unit-create      json
  unit-update      json
  unit-delete      json
  shopping-list    text, json
  shopping-list-add
                   json
  shopping-list-update
                   json
  shopping-list-delete
                   json
  shopping-list-done
                   json
  shopping-list-clean
                   json
  products         table, json
  product-search   table, json
  product-create   json
  product-update   json
  product-delete   json
  recipes          table, json
  recipe-get       table, json
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
  userfields-update
                   json
  userfields-delete
                   json
  userfields-get   table, json
  userfields-set   json
  stock            table, json
  stock-expiring   text, table, json
  stock-low        text, table, json
  stock-summary    text, json
  stock-add        json
  stock-transaction-undo
                   json

Examples:
  node bin/grocy-openclaw.js api-docs --format text
  node bin/grocy-openclaw.js system-info --format json
  node bin/grocy-openclaw.js locations --format table
  node bin/grocy-openclaw.js menu-check --recipe "Pancakes" --servings 4 --format text
  node bin/grocy-openclaw.js menu-plan --count 3 --servings 4 --format text
  node bin/grocy-openclaw.js menu-shopping-list --recipes '[{"name":"Pancakes","servings":4}]' --format text
  node bin/grocy-openclaw.js meal-plan --from 2026-07-15 --to 2026-07-21 --format table
  node bin/grocy-openclaw.js meal-plan-add --date 2026-07-16 --recipe "Pancakes" --format json
  node bin/grocy-openclaw.js meal-plan-update --entry-id 12 --date 2026-07-17 --note "changed" --format json
  node bin/grocy-openclaw.js meal-plan-delete --entry-id 12 --confirm-recipe-name "Pancakes" --format json
  node bin/grocy-openclaw.js units --format table
  node bin/grocy-openclaw.js unit-create --name "банка" --name-plural "банки" --format json
  node bin/grocy-openclaw.js unit-update --unit-id 7 --name "jar" --name-plural "jars" --format json
  node bin/grocy-openclaw.js unit-delete --unit-id 7 --confirm-unit-name "jar" --format json
  node bin/grocy-openclaw.js shopping-list --format text
  node bin/grocy-openclaw.js shopping-list-add --product "Milk" --amount 2 --unit "bottle" --format json
  node bin/grocy-openclaw.js shopping-list-update --item-id 12 --amount 3 --unit "bottle" --note "sale" --format json
  node bin/grocy-openclaw.js shopping-list-delete --item-id 12 --format json
  node bin/grocy-openclaw.js shopping-list-done --item-id 12 --format json
  node bin/grocy-openclaw.js shopping-list-clean --list-id 1 --format json
  node bin/grocy-openclaw.js products --format table
  node bin/grocy-openclaw.js product-search --name "Milk" --format table
  node bin/grocy-openclaw.js product-create --name "Pickles" --location "Pantry" --stock-unit "шт" --purchase-unit "банка" --purchase-to-stock-factor 10 --format json
  node bin/grocy-openclaw.js product-update --product-id 42 --name "Milk 2.5%" --active true --format json
  node bin/grocy-openclaw.js product-delete --product-id 42 --confirm-product-name "Milk 2.5%" --format json
  node bin/grocy-openclaw.js recipes --format table
  node bin/grocy-openclaw.js recipe-get --recipe "Pancakes" --format table
  node bin/grocy-openclaw.js recipe-create --name "Salad" --ingredients '[{"name":"Pickles","amount":3,"unit":"шт"}]' --format json
  node bin/grocy-openclaw.js recipe-update --recipe "Salad" --name "Potato salad" --base-servings 4 --format json
  node bin/grocy-openclaw.js recipe-delete --recipe-id 11 --confirm-recipe-name "Potato salad" --delete-ingredients true --format json
  node bin/grocy-openclaw.js recipe-ingredient-add --recipe "Pancakes" --product "Sunflower oil" --amount 2 --unit "tbsp" --format json
  node bin/grocy-openclaw.js recipe-ingredient-update --recipe "Pancakes" --product "Sunflower oil" --amount 0.03 --unit "л" --format json
  node bin/grocy-openclaw.js recipe-ingredient-delete --position-id 12 --format json
  node bin/grocy-openclaw.js userfields --entity recipes --format table
  node bin/grocy-openclaw.js userfields-create --entity recipes --caption "Время готовки" --type text-single-line --format json
  node bin/grocy-openclaw.js userfields-update --entity recipes --field cook_time --caption "Cooking time" --format json
  node bin/grocy-openclaw.js userfields-delete --userfield-id 14 --confirm-field-name cook_time --format json
  node bin/grocy-openclaw.js userfields-get --entity recipes --object-id 10 --format json
  node bin/grocy-openclaw.js userfields-set --entity recipes --object-name "Pancakes" --values '{"difficulty":"easy","cook_time":"10 minutes"}' --format json
  node bin/grocy-openclaw.js stock --format json
  node bin/grocy-openclaw.js stock-expiring --days 7 --format text
  node bin/grocy-openclaw.js stock-low --format text
  node bin/grocy-openclaw.js stock-summary --format text
  node bin/grocy-openclaw.js stock-add --product "Milk" --amount 1 --unit "l" --price 2.49 --format json
  node bin/grocy-openclaw.js stock-transaction-undo --transaction-id "abc123" --format json
`;

const COMMAND_FORMATS = new Map([
  ['api-docs', new Set(['text', 'json'])],
  ['system-info', new Set(['json'])],
  ['locations', new Set(['table', 'json'])],
  ['menu-check', new Set(['text', 'json'])],
  ['menu-plan', new Set(['text', 'json'])],
  ['menu-shopping-list', new Set(['text', 'json'])],
  ['meal-plan', new Set(['table', 'json'])],
  ['meal-plan-add', new Set(['json'])],
  ['meal-plan-update', new Set(['json'])],
  ['meal-plan-delete', new Set(['json'])],
  ['units', new Set(['table', 'json'])],
  ['unit-create', new Set(['json'])],
  ['unit-update', new Set(['json'])],
  ['unit-delete', new Set(['json'])],
  ['shopping-list', new Set(['text', 'json'])],
  ['shopping-list-add', new Set(['json'])],
  ['shopping-list-update', new Set(['json'])],
  ['shopping-list-delete', new Set(['json'])],
  ['shopping-list-done', new Set(['json'])],
  ['shopping-list-clean', new Set(['json'])],
  ['products', new Set(['table', 'json'])],
  ['product-search', new Set(['table', 'json'])],
  ['product-create', new Set(['json'])],
  ['product-update', new Set(['json'])],
  ['product-delete', new Set(['json'])],
  ['recipes', new Set(['table', 'json'])],
  ['recipe-get', new Set(['table', 'json'])],
  ['recipe-create', new Set(['json'])],
  ['recipe-update', new Set(['json'])],
  ['recipe-delete', new Set(['json'])],
  ['recipe-ingredient-add', new Set(['json'])],
  ['recipe-ingredient-update', new Set(['json'])],
  ['recipe-ingredient-delete', new Set(['json'])],
  ['userfields', new Set(['table', 'json'])],
  ['userfields-create', new Set(['json'])],
  ['userfields-update', new Set(['json'])],
  ['userfields-delete', new Set(['json'])],
  ['userfields-get', new Set(['table', 'json'])],
  ['userfields-set', new Set(['json'])],
  ['stock', new Set(['table', 'json'])],
  ['stock-expiring', new Set(['text', 'table', 'json'])],
  ['stock-low', new Set(['text', 'table', 'json'])],
  ['stock-summary', new Set(['text', 'json'])],
  ['stock-add', new Set(['json'])],
  ['stock-transaction-undo', new Set(['json'])],
]);

const MENU_PLANNING_OPTIONS = new Set([
  'recipe',
  'recipe-id',
  'recipes',
  'servings',
]);

const MENU_PLAN_OPTIONS = new Set([
  'count',
  'servings',
  'only-ready',
]);

const COMMAND_OPTIONS = new Map([
  ['menu-check', MENU_PLANNING_OPTIONS],
  ['menu-plan', MENU_PLAN_OPTIONS],
  ['menu-shopping-list', MENU_PLANNING_OPTIONS],
  ['meal-plan', new Set([
    'from',
    'to',
  ])],
  ['meal-plan-add', new Set([
    'date',
    'recipe',
    'recipe-id',
    'servings',
    'section',
    'section-id',
    'note',
  ])],
  ['meal-plan-update', new Set([
    'entry-id',
    'date',
    'recipe',
    'recipe-id',
    'servings',
    'section',
    'section-id',
    'note',
  ])],
  ['meal-plan-delete', new Set([
    'entry-id',
    'confirm-recipe-name',
  ])],
  ['shopping-list-add', new Set([
    'product',
    'product-id',
    'name',
    'amount',
    'unit',
    'unit-id',
    'note',
    'list-id',
  ])],
  ['shopping-list-update', new Set([
    'item-id',
    'product',
    'product-id',
    'name',
    'amount',
    'unit',
    'unit-id',
    'note',
    'list-id',
  ])],
  ['shopping-list-delete', new Set([
    'item-id',
  ])],
  ['shopping-list-done', new Set([
    'item-id',
    'done',
  ])],
  ['shopping-list-clean', new Set([
    'list-id',
    'dry-run',
  ])],
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
  ['recipe-get', new Set([
    'recipe',
    'recipe-id',
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
  ['userfields-update', new Set([
    'userfield-id',
    'entity',
    'field',
    'name',
    'caption',
    'type',
    'show-as-column',
    'input-required',
    'sort-number',
    'config',
    'default-value',
  ])],
  ['userfields-delete', new Set([
    'userfield-id',
    'entity',
    'field',
    'confirm-field-name',
    'delete-values',
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
  ['stock-expiring', new Set([
    'days',
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
    case 'menu-check':
      output = await runMenuCheckCommand({ client, format, options });
      break;
    case 'menu-plan':
      output = await runMenuPlanCommand({ client, format, options });
      break;
    case 'menu-shopping-list':
      output = await runMenuShoppingListCommand({ client, format, options });
      break;
    case 'meal-plan':
      output = await runMealPlanCommand({ client, format, options });
      break;
    case 'meal-plan-add':
      output = await runMealPlanAddCommand({ client, format, options });
      break;
    case 'meal-plan-update':
      output = await runMealPlanUpdateCommand({ client, format, options });
      break;
    case 'meal-plan-delete':
      output = await runMealPlanDeleteCommand({ client, format, options });
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
    case 'shopping-list-add':
      output = await runShoppingListAddCommand({ client, format, options });
      break;
    case 'shopping-list-update':
      output = await runShoppingListUpdateCommand({ client, format, options });
      break;
    case 'shopping-list-delete':
      output = await runShoppingListDeleteCommand({ client, format, options });
      break;
    case 'shopping-list-done':
      output = await runShoppingListDoneCommand({ client, format, options });
      break;
    case 'shopping-list-clean':
      output = await runShoppingListCleanCommand({ client, format, options });
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
    case 'recipes':
      output = await runRecipesCommand({ client, format });
      break;
    case 'recipe-get':
      output = await runRecipeGetCommand({ client, format, options });
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
    case 'userfields-update':
      output = await runUserfieldsUpdateCommand({ client, format, options });
      break;
    case 'userfields-delete':
      output = await runUserfieldsDeleteCommand({ client, format, options });
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
    case 'stock-expiring':
      output = await runStockExpiringCommand({ client, format, options });
      break;
    case 'stock-low':
      output = await runStockLowCommand({ client, format });
      break;
    case 'stock-summary':
      output = await runStockSummaryCommand({ client, format });
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
