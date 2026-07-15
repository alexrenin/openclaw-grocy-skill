const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readCommandIndex() {
  return JSON.parse(readFileSync(path.join(__dirname, '..', 'docs', 'commands.json'), 'utf8'));
}

function readCliCommandNames() {
  const source = readFileSync(path.join(__dirname, '..', 'bin', 'grocy-openclaw.js'), 'utf8');
  return [...source.matchAll(/case '([^']+)':/g)].map((match) => match[1]);
}

function readCliCommandFormats() {
  const source = readFileSync(path.join(__dirname, '..', 'bin', 'grocy-openclaw.js'), 'utf8');
  const formatsBlock = source.match(/const COMMAND_FORMATS = new Map\(\[([\s\S]*?)\]\);/);

  assert.ok(formatsBlock, 'COMMAND_FORMATS block should be present');

  return new Map([...formatsBlock[1].matchAll(/\['([^']+)', new Set\(\[([^\]]*)\]\)\]/g)]
    .map((match) => {
      const formats = [...match[2].matchAll(/'([^']+)'/g)].map((formatMatch) => formatMatch[1]);
      return [match[1], formats];
    }));
}

test('command index declares its policy scope', () => {
  const index = readCommandIndex();

  assert.equal(index.schemaVersion, 1);
  assert.equal(index.indexType, 'policy');
  assert.ok(index.policyScope.includes('read/write classification'));
  assert.ok(index.policyScope.includes('confirmation requirements'));
  assert.ok(index.policyScope.includes('mode-specific safety behavior'));
  assert.ok(index.nonGoals.includes('complete CLI option schema'));
  assert.ok(index.nonGoals.includes('replacement for CLI argument validation'));
});

test('command index lists every CLI command exactly once', () => {
  const index = readCommandIndex();
  const indexedNames = index.commands.map((command) => command.name);
  const cliNames = readCliCommandNames();

  assert.equal(index.commandCount, index.commands.length);
  assert.deepEqual([...indexedNames].sort(), [...new Set(indexedNames)].sort());
  assert.deepEqual(indexedNames.sort(), cliNames.sort());
});

test('command index uses a strict command record shape', () => {
  const index = readCommandIndex();
  const allowedKeys = new Set([
    'name',
    'type',
    'formats',
    'requiresConfirmation',
    'purpose',
    'selectors',
    'confirmationDetails',
    'correctionCommand',
    'removalCommand',
    'fallbackCorrection',
    'modes',
  ]);

  for (const command of index.commands) {
    for (const key of Object.keys(command)) {
      assert.ok(allowedKeys.has(key), `${command.name} has unexpected key: ${key}`);
    }

    assert.equal(typeof command.name, 'string', 'command name must be a string');
    assert.ok(command.name.length > 0, 'command name must not be empty');
    assert.ok(Array.isArray(command.formats), `${command.name} formats must be an array`);
    assert.ok(command.formats.length > 0, `${command.name} needs at least one format`);
    assert.equal(typeof command.requiresConfirmation, 'boolean', `${command.name} requiresConfirmation must be boolean`);
    assert.equal(typeof command.purpose, 'string', `${command.name} purpose must be a string`);
    assert.ok(command.purpose.length > 0, `${command.name} purpose must not be empty`);
    assert.ok(Array.isArray(command.selectors), `${command.name} selectors must be an array`);
    assert.ok(Array.isArray(command.confirmationDetails), `${command.name} confirmationDetails must be an array`);
    assert.ok(
      command.correctionCommand === null || typeof command.correctionCommand === 'string',
      `${command.name} correctionCommand must be null or string`,
    );
  }
});

test('command index formats match CLI formats', () => {
  const index = readCommandIndex();
  const cliFormats = readCliCommandFormats();

  for (const command of index.commands) {
    assert.deepEqual(
      command.formats,
      cliFormats.get(command.name),
      `${command.name} formats must match COMMAND_FORMATS`,
    );
  }
});

test('command index marks write commands as requiring confirmation', () => {
  const index = readCommandIndex();

  for (const command of index.commands) {
    assert.ok(['read', 'write'].includes(command.type), `${command.name} has invalid type`);

    if (command.type === 'write') {
      assert.equal(command.requiresConfirmation, true, `${command.name} must require confirmation`);
      assert.ok(command.confirmationDetails.length > 0, `${command.name} needs confirmation details`);
    } else {
      assert.equal(command.requiresConfirmation, false, `${command.name} should not require confirmation`);
    }
  }
});

test('command index validates mode-specific safety metadata', () => {
  const index = readCommandIndex();
  const allowedModeKeys = new Set([
    'name',
    'when',
    'default',
    'type',
    'requiresConfirmation',
    'purpose',
    'confirmationDetails',
  ]);

  for (const command of index.commands) {
    if (!command.modes) {
      continue;
    }

    assert.ok(Array.isArray(command.modes), `${command.name} modes must be an array`);
    assert.equal(
      command.modes.filter((mode) => mode.default === true).length,
      1,
      `${command.name} modes need exactly one default mode`,
    );

    for (const mode of command.modes) {
      for (const key of Object.keys(mode)) {
        assert.ok(allowedModeKeys.has(key), `${command.name}:${mode.name || 'unnamed'} has unexpected key: ${key}`);
      }

      assert.ok(mode.name, `${command.name} mode needs a name`);
      assert.ok(['read', 'write'].includes(mode.type), `${command.name}:${mode.name} has invalid type`);
      assert.equal(typeof mode.requiresConfirmation, 'boolean', `${command.name}:${mode.name} needs requiresConfirmation`);
      assert.equal(typeof mode.purpose, 'string', `${command.name}:${mode.name} purpose must be a string`);
      assert.ok(mode.purpose.length > 0, `${command.name}:${mode.name} purpose must not be empty`);

      if (mode.default === true) {
        assert.equal(mode.when, undefined, `${command.name}:${mode.name} default mode must not have a when condition`);
      } else {
        assert.ok(mode.when && typeof mode.when === 'object' && !Array.isArray(mode.when), `${command.name}:${mode.name} needs a when condition`);
        assert.ok(Object.keys(mode.when).length > 0, `${command.name}:${mode.name} when condition must not be empty`);

        for (const [option, value] of Object.entries(mode.when)) {
          assert.ok(option.length > 0, `${command.name}:${mode.name} when option must not be empty`);
          assert.equal(typeof value, 'string', `${command.name}:${mode.name} when value must be a canonical string`);
          assert.ok(value.length > 0, `${command.name}:${mode.name} when value must not be empty`);
        }
      }

      if (mode.type === 'write') {
        assert.equal(mode.requiresConfirmation, true, `${command.name}:${mode.name} must require confirmation`);
        assert.ok(mode.confirmationDetails?.length > 0, `${command.name}:${mode.name} needs confirmation details`);
      } else {
        assert.equal(mode.requiresConfirmation, false, `${command.name}:${mode.name} should not require confirmation`);
      }
    }
  }
});

test('commands with safety-sensitive options are represented as modes', () => {
  const index = readCommandIndex();
  const commandsByName = new Map(index.commands.map((command) => [command.name, command]));
  const expectedModes = [
    ['shopping-list-clean', 'dry-run', 'true'],
    ['recipe-create', 'create-missing-products', 'true'],
    ['recipe-ingredient-add', 'create-missing-products', 'true'],
    ['recipe-delete', 'delete-ingredients', 'true'],
    ['userfields-delete', 'delete-values', 'true'],
  ];

  for (const [commandName, option, value] of expectedModes) {
    const command = commandsByName.get(commandName);

    assert.ok(command, `${commandName} must exist`);
    assert.ok(
      command.modes?.some((mode) => mode.when?.[option] === value),
      `${commandName} must document mode for --${option} ${value}`,
    );
  }
});

test('create and add commands document correction or removal paths', () => {
  const index = readCommandIndex();

  for (const command of index.commands) {
    const isCreateOrAdd = /(^|-)create$|(^|-)add$/.test(command.name);

    if (command.type === 'write' && isCreateOrAdd) {
      assert.ok(
        command.correctionCommand || command.removalCommand,
        `${command.name} needs a correction or removal path`,
      );
    }
  }
});

test('correction and removal command references point to CLI commands', () => {
  const index = readCommandIndex();
  const commandNames = new Set(index.commands.map((command) => command.name));
  const referenceFields = ['correctionCommand', 'removalCommand', 'fallbackCorrection'];

  for (const command of index.commands) {
    for (const field of referenceFields) {
      const reference = command[field];

      if (!reference) {
        continue;
      }

      const referencedCommand = String(reference).split(/\s+/)[0];
      assert.ok(
        commandNames.has(referencedCommand),
        `${command.name}.${field} references unknown command ${referencedCommand}`,
      );
    }
  }
});
