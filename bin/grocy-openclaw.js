#!/usr/bin/env node

'use strict';

const { createGrocyClientFromEnv } = require('../src/grocy-client');
const { runProductsCommand } = require('../src/commands/products');
const { runShoppingListCommand } = require('../src/commands/shopping-list');
const { runStockCommand } = require('../src/commands/stock');
const { runSystemInfoCommand } = require('../src/commands/system-info');

const HELP = `Usage:
  node bin/grocy-openclaw.js <command> --format <format>

Commands:
  system-info      Read Grocy system info
  shopping-list    Read Grocy shopping list
  products         Read Grocy products
  stock            Read Grocy stock

Formats:
  system-info      json
  shopping-list    text, json
  products         table, json
  stock            table, json

Examples:
  node bin/grocy-openclaw.js system-info --format json
  node bin/grocy-openclaw.js shopping-list --format text
  node bin/grocy-openclaw.js products --format table
  node bin/grocy-openclaw.js stock --format json
`;

const COMMAND_FORMATS = new Map([
  ['system-info', new Set(['json'])],
  ['shopping-list', new Set(['text', 'json'])],
  ['products', new Set(['table', 'json'])],
  ['stock', new Set(['table', 'json'])],
]);

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0];
  let format;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--format') {
      format = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      format = arg.slice('--format='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { command, format };
}

function printHelp() {
  process.stdout.write(HELP);
}

async function main(argv, env = process.env) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return 0;
  }

  const { command, format } = parseArgs(argv);
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

  const client = createGrocyClientFromEnv(env);
  let output;

  switch (command) {
    case 'system-info':
      output = await runSystemInfoCommand({ client, format });
      break;
    case 'shopping-list':
      output = await runShoppingListCommand({ client, format });
      break;
    case 'products':
      output = await runProductsCommand({ client, format });
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
};
