'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildApiDocsLinks,
  getGrocyVersion,
  runApiDocsCommand,
} = require('../src/commands/api-docs');

test('extracts Grocy version from system info', () => {
  assert.equal(getGrocyVersion({
    grocy_version: {
      Version: '4.6.0',
    },
  }), '4.6.0');
});

test('ignores unexpected Grocy version strings', () => {
  assert.equal(getGrocyVersion({
    grocy_version: {
      Version: 'dev-master',
    },
  }), '');
});

test('builds version-specific OpenAPI links', () => {
  const docs = buildApiDocsLinks('4.6.0');

  assert.equal(docs.openapi.ref, 'v4.6.0');
  assert.equal(docs.openapi.githubUrl, 'https://github.com/grocy/grocy/blob/v4.6.0/grocy.openapi.json');
  assert.equal(docs.openapi.rawUrl, 'https://raw.githubusercontent.com/grocy/grocy/v4.6.0/grocy.openapi.json');
  assert.equal(docs.openapi.latestGithubUrl, 'https://github.com/grocy/grocy/blob/master/grocy.openapi.json');
});

test('runs api-docs text command', async () => {
  const output = await runApiDocsCommand({
    format: 'text',
    client: {
      getSystemInfo: async () => ({
        grocy_version: {
          Version: '4.6.0',
        },
      }),
    },
  });

  assert.match(output, /Installed Grocy version: 4\.6\.0/);
  assert.match(output, /https:\/\/github\.com\/grocy\/grocy\/blob\/v4\.6\.0\/grocy\.openapi\.json/);
});

test('runs api-docs json command', async () => {
  const output = await runApiDocsCommand({
    format: 'json',
    client: {
      getSystemInfo: async () => ({
        grocy_version: {
          Version: '4.6.0',
        },
      }),
    },
  });

  assert.deepEqual(JSON.parse(output), buildApiDocsLinks('4.6.0'));
});
