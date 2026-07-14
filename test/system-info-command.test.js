'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { runSystemInfoCommand } = require('../src/commands/system-info');

test('runs system-info json command', async () => {
  const output = await runSystemInfoCommand({
    format: 'json',
    client: {
      getSystemInfo: async () => ({
        grocy_version: {
          Version: '4.0.0',
        },
      }),
    },
  });

  assert.equal(output, JSON.stringify({
    grocy_version: {
      Version: '4.0.0',
    },
  }, null, 2));
});
