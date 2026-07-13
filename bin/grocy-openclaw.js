#!/usr/bin/env node

'use strict';

const HELP = `Usage:
  node bin/grocy-openclaw.js <command> --format <format>

Commands:
  shopping-list    Read Grocy shopping list
  products         Read Grocy products
  stock            Read Grocy stock

Formats:
  shopping-list    text, json
  products         table, json
  stock            table, json

Examples:
  node bin/grocy-openclaw.js shopping-list --format text
  node bin/grocy-openclaw.js products --format table
  node bin/grocy-openclaw.js stock --format json
`;

const COMMAND_FORMATS = new Map([
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

function main(argv) {
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

  throw new Error(`${command} command is not implemented yet.`);
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  parseArgs,
};
