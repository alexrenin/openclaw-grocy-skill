'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { GrocyClient, normalizeBaseUrl, sanitize } = require('../src/grocy-client');

test('normalizes base URL trailing slash', () => {
  assert.equal(normalizeBaseUrl('http://grocy/'), 'http://grocy');
  assert.equal(normalizeBaseUrl('http://grocy///'), 'http://grocy');
});

test('sends Grocy API key in header', async () => {
  let requestUrl;
  let requestHeaders;

  const client = new GrocyClient({
    baseUrl: 'http://grocy/',
    apiKey: 'secret-key',
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestHeaders = options.headers;

      return {
        ok: true,
        text: async () => '{"ok":true}',
      };
    },
  });

  const data = await client.request('/api/system/info');

  assert.deepEqual(data, { ok: true });
  assert.equal(requestUrl, 'http://grocy/api/system/info');
  assert.equal(requestHeaders['GROCY-API-KEY'], 'secret-key');
});

test('redacts API key from Grocy API error body', async () => {
  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'failed with secret-key',
    }),
  });

  await assert.rejects(
    () => client.request('/api/system/info'),
    /failed with \[redacted\]/,
  );
});

test('sanitize redacts secret values', () => {
  assert.equal(sanitize('abc secret abc', 'secret'), 'abc [redacted] abc');
});
