'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  loadEnvWithDotEnvFallback,
  parseDotEnvFile,
} = require('../src/env');

test('parses dotenv content without exposing values', () => {
  assert.deepEqual(parseDotEnvFile(`
# comment
GROCY_URL=http://grocy
GROCY_API_KEY="secret value"
EMPTY=
INVALID-NAME=ignored
NOTE=value # inline comment
`), {
    GROCY_URL: 'http://grocy',
    GROCY_API_KEY: 'secret value',
    EMPTY: '',
    NOTE: 'value',
  });
});

test('loads .env values when process env is missing', (t) => {
  const cwd = createTempDir(t);
  fs.writeFileSync(path.join(cwd, '.env'), [
    'GROCY_URL=http://grocy',
    'GROCY_API_KEY=secret-key',
  ].join('\n'));

  const env = loadEnvWithDotEnvFallback({}, { cwd });

  assert.equal(env.GROCY_URL, 'http://grocy');
  assert.equal(env.GROCY_API_KEY, 'secret-key');
});

test('does not overwrite existing process env values', (t) => {
  const cwd = createTempDir(t);
  fs.writeFileSync(path.join(cwd, '.env'), [
    'GROCY_URL=http://from-file',
    'GROCY_API_KEY=file-key',
  ].join('\n'));

  const env = loadEnvWithDotEnvFallback({
    GROCY_URL: 'http://from-env',
    GROCY_API_KEY: 'env-key',
  }, { cwd });

  assert.equal(env.GROCY_URL, 'http://from-env');
  assert.equal(env.GROCY_API_KEY, 'env-key');
});

test('uses .env only for missing process env values', (t) => {
  const cwd = createTempDir(t);
  fs.writeFileSync(path.join(cwd, '.env'), [
    'GROCY_URL=http://from-file',
    'GROCY_API_KEY=file-key',
  ].join('\n'));

  const env = loadEnvWithDotEnvFallback({
    GROCY_URL: 'http://from-env',
  }, { cwd });

  assert.equal(env.GROCY_URL, 'http://from-env');
  assert.equal(env.GROCY_API_KEY, 'file-key');
});

test('returns env unchanged when .env is missing', (t) => {
  const cwd = createTempDir(t);
  const source = { OTHER: 'value' };

  assert.deepEqual(loadEnvWithDotEnvFallback(source, { cwd }), source);
});

function createTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grocy-env-test-'));

  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  return dir;
}
