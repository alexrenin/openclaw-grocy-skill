'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_GROCY_ENV_KEYS = ['GROCY_URL', 'GROCY_API_KEY'];

function loadEnvWithDotEnvFallback(env, options = {}) {
  const cwd = options.cwd || process.cwd();

  if (hasAllRequiredGrocyEnv(env)) {
    return { ...env };
  }

  const dotEnvPath = path.join(cwd, '.env');

  if (!fs.existsSync(dotEnvPath)) {
    return { ...env };
  }

  const parsed = parseDotEnvFile(fs.readFileSync(dotEnvPath, 'utf8'));
  const merged = { ...env };

  for (const [key, value] of Object.entries(parsed)) {
    if (!hasEnvValue(merged[key])) {
      merged[key] = value;
    }
  }

  return merged;
}

function hasAllRequiredGrocyEnv(env) {
  return REQUIRED_GROCY_ENV_KEYS.every((key) => hasEnvValue(env[key]));
}

function parseDotEnvFile(contents) {
  const parsed = {};

  for (const line of String(contents || '').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    parsed[key] = parseDotEnvValue(trimmed.slice(separatorIndex + 1).trim());
  }

  return parsed;
}

function parseDotEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return stripInlineComment(value).trim();
}

function stripInlineComment(value) {
  const commentIndex = value.search(/\s#/);

  if (commentIndex === -1) {
    return value;
  }

  return value.slice(0, commentIndex);
}

function hasEnvValue(value) {
  return value != null && String(value).trim() !== '';
}

module.exports = {
  loadEnvWithDotEnvFallback,
  parseDotEnvFile,
};
