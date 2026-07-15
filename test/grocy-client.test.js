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

test('reads a single object through Grocy objects API', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '{"id":42,"name":"Milk"}',
      };
    },
  });

  const data = await client.getObject('products', 42);

  assert.deepEqual(data, { id: 42, name: 'Milk' });
  assert.equal(requestUrl, 'http://grocy/api/objects/products/42');
});

test('updates products through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const payload = { id: 42, name: 'Milk 2.5%' };
  const data = await client.updateProduct(42, payload);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/products/42');
  assert.equal(requestOptions.method, 'PUT');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('deletes products through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const data = await client.deleteProduct(42);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/products/42');
  assert.equal(requestOptions.method, 'DELETE');
});

test('reads locations through Grocy objects API', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '[{"id":1,"name":"Кладовка"}]',
      };
    },
  });

  const data = await client.getLocations();

  assert.deepEqual(data, [{ id: 1, name: 'Кладовка' }]);
  assert.equal(requestUrl, 'http://grocy/api/objects/locations');
});

test('creates quantity units through Grocy objects API', async () => {
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
        text: async () => '{"created_object_id":7}',
      };
    },
  });

  const data = await client.createQuantityUnit({ name: 'банка', name_plural: 'банки' });

  assert.deepEqual(data, { created_object_id: 7 });
  assert.equal(requestUrl, 'http://grocy/api/objects/quantity_units');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, '{"name":"банка","name_plural":"банки"}');
});

test('updates quantity units through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const payload = { id: 7, name: 'jar', name_plural: 'jars' };
  const data = await client.updateQuantityUnit(7, payload);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/quantity_units/7');
  assert.equal(requestOptions.method, 'PUT');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('deletes quantity units through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const data = await client.deleteQuantityUnit(7);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/quantity_units/7');
  assert.equal(requestOptions.method, 'DELETE');
});

test('adds product amount through Grocy stock API', async () => {
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
        text: async () => '{"ok":true}',
      };
    },
  });

  const payload = {
    amount: 1,
    transaction_type: 'purchase',
    price: 2.49,
  };
  const data = await client.addStockProduct(42, payload);

  assert.deepEqual(data, { ok: true });
  assert.equal(requestUrl, 'http://grocy/api/stock/products/42/add');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('uses Grocy stock inventory, consume, and transfer endpoints', async () => {
  const requests = [];
  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });

      return {
        ok: true,
        text: async () => '[{"transaction_id":"tx-1"}]',
      };
    },
  });

  await client.inventoryStockProduct(42, { new_amount: 3 });
  await client.consumeStockProduct(42, { amount: 1, transaction_type: 'consume' });
  await client.transferStockProduct(42, { amount: 1, location_id_from: 1, location_id_to: 2 });

  assert.deepEqual(requests.map(({ url, options }) => [url, options.method]), [
    ['http://grocy/api/stock/products/42/inventory', 'POST'],
    ['http://grocy/api/stock/products/42/consume', 'POST'],
    ['http://grocy/api/stock/products/42/transfer', 'POST'],
  ]);
  assert.equal(requests[0].options.body, JSON.stringify({ new_amount: 3 }));
  assert.equal(requests[1].options.body, JSON.stringify({ amount: 1, transaction_type: 'consume' }));
  assert.equal(requests[2].options.body, JSON.stringify({ amount: 1, location_id_from: 1, location_id_to: 2 }));
});

test('uses Grocy shopping list object and clean endpoints', async () => {
  const requests = [];
  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, text: async () => '' };
    },
  });

  await client.createShoppingListItem({ product_id: 42, amount: 1 });
  await client.updateShoppingListItem(12, { done: 1 });
  await client.deleteShoppingListItem(12);
  await client.clearShoppingList({ list_id: 1, done_only: true });

  assert.deepEqual(requests.map(({ url, options }) => [url, options.method]), [
    ['http://grocy/api/objects/shopping_list', 'POST'],
    ['http://grocy/api/objects/shopping_list/12', 'PUT'],
    ['http://grocy/api/objects/shopping_list/12', 'DELETE'],
    ['http://grocy/api/stock/shoppinglist/clear', 'POST'],
  ]);
  assert.equal(requests[3].options.body, JSON.stringify({ list_id: 1, done_only: true }));
});

test('uses Grocy meal plan object endpoints', async () => {
  const requests = [];
  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return { ok: true, text: async () => '' };
    },
  });

  await client.getMealPlanEntries();
  await client.getMealPlanEntry(12);
  await client.getMealPlanSections();
  await client.createMealPlanEntry({ day: '2026-07-16', recipe_id: 1 });
  await client.updateMealPlanEntry(12, { day: '2026-07-17', recipe_id: 2 });
  await client.deleteMealPlanEntry(12);

  assert.deepEqual(requests.map(({ url, options }) => [url, options.method]), [
    ['http://grocy/api/objects/meal_plan', undefined],
    ['http://grocy/api/objects/meal_plan/12', undefined],
    ['http://grocy/api/objects/meal_plan_sections', undefined],
    ['http://grocy/api/objects/meal_plan', 'POST'],
    ['http://grocy/api/objects/meal_plan/12', 'PUT'],
    ['http://grocy/api/objects/meal_plan/12', 'DELETE'],
  ]);
  assert.equal(requests[3].options.body, JSON.stringify({ day: '2026-07-16', recipe_id: 1 }));
  assert.equal(requests[4].options.body, JSON.stringify({ day: '2026-07-17', recipe_id: 2 }));
});

test('reads volatile stock through Grocy stock API', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '{"missing_products":[],"due_products":[]}',
      };
    },
  });

  const data = await client.getStockVolatile();

  assert.deepEqual(data, { missing_products: [], due_products: [] });
  assert.equal(requestUrl, 'http://grocy/api/stock/volatile');
});

test('reads volatile stock with a due-soon window', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '{"due_products":[]}',
      };
    },
  });

  await client.getStockVolatile({ dueSoonDays: 7 });

  assert.equal(requestUrl, 'http://grocy/api/stock/volatile?due_soon_days=7');
});

test('reads stock transaction through Grocy stock API', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '[{"id":1,"transaction_id":"tx-1"}]',
      };
    },
  });

  const data = await client.getStockTransaction('tx-1');

  assert.deepEqual(data, [{ id: 1, transaction_id: 'tx-1' }]);
  assert.equal(requestUrl, 'http://grocy/api/stock/transactions/tx-1');
});

test('undoes stock transaction through Grocy stock API', async () => {
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
        text: async () => '',
      };
    },
  });

  const data = await client.undoStockTransaction('tx-1');

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/stock/transactions/tx-1/undo');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['GROCY-API-KEY'], 'secret-key');
});

test('creates quantity unit conversions through Grocy objects API', async () => {
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
        text: async () => '{"created_object_id":8}',
      };
    },
  });

  const payload = {
    from_qu_id: 2,
    to_qu_id: 1,
    factor: 10,
    product_id: 42,
  };
  const data = await client.createQuantityUnitConversion(payload);

  assert.deepEqual(data, { created_object_id: 8 });
  assert.equal(requestUrl, 'http://grocy/api/objects/quantity_unit_conversions');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('creates recipes through Grocy objects API', async () => {
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
        text: async () => '{"created_object_id":11}',
      };
    },
  });

  const data = await client.createRecipe({ name: 'Soup', type: 'normal' });

  assert.deepEqual(data, { created_object_id: 11 });
  assert.equal(requestUrl, 'http://grocy/api/objects/recipes');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, '{"name":"Soup","type":"normal"}');
});

test('creates recipe positions through Grocy objects API', async () => {
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
        text: async () => '{"created_object_id":12}',
      };
    },
  });

  const payload = {
    recipe_id: 11,
    product_id: 42,
    amount: 3,
    qu_id: 1,
  };
  const data = await client.createRecipePosition(payload);

  assert.deepEqual(data, { created_object_id: 12 });
  assert.equal(requestUrl, 'http://grocy/api/objects/recipes_pos');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('updates recipes through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const payload = { id: 11, name: 'Soup', type: 'normal', base_servings: 4 };
  const data = await client.updateRecipe(11, payload);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/recipes/11');
  assert.equal(requestOptions.method, 'PUT');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('deletes recipes through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const data = await client.deleteRecipe(11);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/recipes/11');
  assert.equal(requestOptions.method, 'DELETE');
});

test('updates recipe positions through Grocy objects API', async () => {
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
        text: async () => '{"updated":true}',
      };
    },
  });

  const payload = {
    amount: 0.03,
    qu_id: 1,
  };
  const data = await client.updateRecipePosition(12, payload);

  assert.deepEqual(data, { updated: true });
  assert.equal(requestUrl, 'http://grocy/api/objects/recipes_pos/12');
  assert.equal(requestOptions.method, 'PUT');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('deletes recipe positions through Grocy objects API', async () => {
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
        text: async () => '',
      };
    },
  });

  const data = await client.deleteRecipePosition(12);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/objects/recipes_pos/12');
  assert.equal(requestOptions.method, 'DELETE');
});

test('reads userfield definitions through Grocy objects API', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '[{"id":1,"entity":"recipes"}]',
      };
    },
  });

  const data = await client.getUserfields();

  assert.deepEqual(data, [{ id: 1, entity: 'recipes' }]);
  assert.equal(requestUrl, 'http://grocy/api/objects/userfields');
});

test('reads object userfield values through Grocy userfields API', async () => {
  let requestUrl;

  const client = new GrocyClient({
    baseUrl: 'http://grocy',
    apiKey: 'secret-key',
    fetchImpl: async (url) => {
      requestUrl = url;

      return {
        ok: true,
        text: async () => '{"source":"chat"}',
      };
    },
  });

  const data = await client.getObjectUserfields('recipes', 42);

  assert.deepEqual(data, { source: 'chat' });
  assert.equal(requestUrl, 'http://grocy/api/userfields/recipes/42');
});

test('sets object userfield values through Grocy userfields API', async () => {
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
        text: async () => '',
      };
    },
  });

  const payload = {
    difficulty: 'легкий',
    cook_time: '10 минут',
  };
  const data = await client.setObjectUserfields('recipes', 42, payload);

  assert.equal(data, null);
  assert.equal(requestUrl, 'http://grocy/api/userfields/recipes/42');
  assert.equal(requestOptions.method, 'PUT');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('creates userfields through Grocy objects API', async () => {
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
        text: async () => '{"created_object_id":14}',
      };
    },
  });

  const payload = {
    entity: 'recipes',
    name: 'vremya_gotovki',
    caption: 'Время готовки',
    type: 'text-single-line',
  };
  const data = await client.createUserfield(payload);

  assert.deepEqual(data, { created_object_id: 14 });
  assert.equal(requestUrl, 'http://grocy/api/objects/userfields');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers['Content-Type'], 'application/json');
  assert.equal(requestOptions.body, JSON.stringify(payload));
});

test('updates and deletes userfields through Grocy objects API', async () => {
  const requests = [];
  const client = new GrocyClient({
    baseUrl: 'http://grocy', apiKey: 'secret-key',
    fetchImpl: async (url, options) => { requests.push({ url, options }); return { ok: true, text: async () => '' }; },
  });
  await client.updateUserfield(14, { caption: 'Cooking time' });
  await client.deleteUserfield(14);
  assert.equal(requests[0].url, 'http://grocy/api/objects/userfields/14');
  assert.equal(requests[0].options.method, 'PUT');
  assert.equal(requests[1].url, 'http://grocy/api/objects/userfields/14');
  assert.equal(requests[1].options.method, 'DELETE');
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
