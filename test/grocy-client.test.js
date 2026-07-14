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

test('posts JSON object payloads', async () => {
  let requestUrl;
  let requestOptions;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;

      return {
        ok: true,
        text: async () => '{"created_object_id":42}',
      };
    },
  });

  const data = await client.createProduct({ name: 'Молоко', qu_id_stock: 1 });

  assert.deepEqual(data, { created_object_id: 42 });
  assert.equal(requestUrl, 'http://grocy/api/objects/products');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.headers['GROCY-API-KEY'], 'secret-key');
  assert.equal(requestOptions.body, '{"name":"Молоко","qu_id_stock":1}');
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
