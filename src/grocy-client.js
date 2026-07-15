'use strict';

class GrocyClient {
  constructor({ baseUrl, apiKey, fetchImpl = globalThis.fetch }) {
    if (!baseUrl) {
      throw new Error('Missing required environment variable: GROCY_URL');
    }

    if (!apiKey) {
      throw new Error('Missing required environment variable: GROCY_API_KEY');
    }

    if (typeof fetchImpl !== 'function') {
      throw new Error('Fetch API is not available. Use Node.js 18 or newer.');
    }

    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async request(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      'GROCY-API-KEY': this.apiKey,
      ...(options.headers || {}),
    };
    const requestOptions = { ...options, headers };

    if (hasJsonBody(options.body)) {
      requestOptions.body = JSON.stringify(options.body);
      requestOptions.headers = {
        'Content-Type': 'application/json',
        ...headers,
      };
    }

    const response = await this.fetchImpl(`${this.baseUrl}${normalizePath(path)}`, {
      ...requestOptions,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(formatHttpError(response, sanitize(text, this.apiKey)));
    }

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  getSystemInfo() {
    return this.request('/api/system/info');
  }

  getProducts() {
    return this.request('/api/objects/products');
  }

  getObjects(entity) {
    return this.request(`/api/objects/${encodeURIComponent(entity)}`);
  }

  getObject(entity, objectId) {
    return this.request(`/api/objects/${encodeURIComponent(entity)}/${encodeURIComponent(objectId)}`);
  }

  getLocations() {
    return this.request('/api/objects/locations');
  }

  getRecipes() {
    return this.request('/api/objects/recipes');
  }

  getRecipePositions() {
    return this.request('/api/objects/recipes_pos');
  }

  getUserfields() {
    return this.request('/api/objects/userfields');
  }

  getObjectUserfields(entity, objectId) {
    return this.request(`/api/userfields/${encodeURIComponent(entity)}/${encodeURIComponent(objectId)}`);
  }

  setObjectUserfields(entity, objectId, payload) {
    return this.request(`/api/userfields/${encodeURIComponent(entity)}/${encodeURIComponent(objectId)}`, {
      method: 'PUT',
      body: payload,
    });
  }

  getQuantityUnits() {
    return this.request('/api/objects/quantity_units');
  }

  getQuantityUnitConversions() {
    return this.request('/api/objects/quantity_unit_conversions');
  }

  getShoppingList() {
    return this.request('/api/objects/shopping_list');
  }

  getShoppingListItem(objectId) {
    return this.getObject('shopping_list', objectId);
  }

  createShoppingListItem(payload) {
    return this.createObject('shopping_list', payload);
  }

  updateShoppingListItem(objectId, payload) {
    return this.updateObject('shopping_list', objectId, payload);
  }

  deleteShoppingListItem(objectId) {
    return this.deleteObject('shopping_list', objectId);
  }

  clearShoppingList(payload) {
    return this.request('/api/stock/shoppinglist/clear', {
      method: 'POST',
      body: payload,
    });
  }

  getStock() {
    return this.request('/api/stock');
  }

  getMealPlanEntries() {
    return this.getObjects('meal_plan');
  }

  getMealPlanEntry(objectId) {
    return this.getObject('meal_plan', objectId);
  }

  getMealPlanSections() {
    return this.getObjects('meal_plan_sections');
  }

  createMealPlanEntry(payload) {
    return this.createObject('meal_plan', payload);
  }

  updateMealPlanEntry(objectId, payload) {
    return this.updateObject('meal_plan', objectId, payload);
  }

  deleteMealPlanEntry(objectId) {
    return this.deleteObject('meal_plan', objectId);
  }

  getStockVolatile({ dueSoonDays } = {}) {
    const query = dueSoonDays === undefined
      ? ''
      : `?due_soon_days=${encodeURIComponent(dueSoonDays)}`;
    return this.request(`/api/stock/volatile${query}`);
  }

  addStockProduct(productId, payload) {
    return this.request(`/api/stock/products/${encodeURIComponent(productId)}/add`, {
      method: 'POST',
      body: payload,
    });
  }

  consumeStockProduct(productId, payload) {
    return this.request(`/api/stock/products/${encodeURIComponent(productId)}/consume`, {
      method: 'POST',
      body: payload,
    });
  }

  transferStockProduct(productId, payload) {
    return this.request(`/api/stock/products/${encodeURIComponent(productId)}/transfer`, {
      method: 'POST',
      body: payload,
    });
  }

  inventoryStockProduct(productId, payload) {
    return this.request(`/api/stock/products/${encodeURIComponent(productId)}/inventory`, {
      method: 'POST',
      body: payload,
    });
  }

  getStockTransaction(transactionId) {
    return this.request(`/api/stock/transactions/${encodeURIComponent(transactionId)}`);
  }

  undoStockTransaction(transactionId) {
    return this.request(`/api/stock/transactions/${encodeURIComponent(transactionId)}/undo`, {
      method: 'POST',
    });
  }

  createObject(entity, payload) {
    return this.request(`/api/objects/${entity}`, {
      method: 'POST',
      body: payload,
    });
  }

  updateObject(entity, objectId, payload) {
    return this.request(`/api/objects/${entity}/${encodeURIComponent(objectId)}`, {
      method: 'PUT',
      body: payload,
    });
  }

  deleteObject(entity, objectId) {
    return this.request(`/api/objects/${entity}/${encodeURIComponent(objectId)}`, {
      method: 'DELETE',
    });
  }

  createProduct(payload) {
    return this.createObject('products', payload);
  }

  updateProduct(objectId, payload) {
    return this.updateObject('products', objectId, payload);
  }

  deleteProduct(objectId) {
    return this.deleteObject('products', objectId);
  }

  createRecipe(payload) {
    return this.createObject('recipes', payload);
  }

  updateRecipe(objectId, payload) {
    return this.updateObject('recipes', objectId, payload);
  }

  deleteRecipe(objectId) {
    return this.deleteObject('recipes', objectId);
  }

  createRecipePosition(payload) {
    return this.createObject('recipes_pos', payload);
  }

  updateRecipePosition(objectId, payload) {
    return this.updateObject('recipes_pos', objectId, payload);
  }

  deleteRecipePosition(objectId) {
    return this.deleteObject('recipes_pos', objectId);
  }

  createQuantityUnit(payload) {
    return this.createObject('quantity_units', payload);
  }

  updateQuantityUnit(objectId, payload) {
    return this.updateObject('quantity_units', objectId, payload);
  }

  deleteQuantityUnit(objectId) {
    return this.deleteObject('quantity_units', objectId);
  }

  createQuantityUnitConversion(payload) {
    return this.createObject('quantity_unit_conversions', payload);
  }

  updateQuantityUnitConversion(objectId, payload) {
    return this.updateObject('quantity_unit_conversions', objectId, payload);
  }

  createUserfield(payload) {
    return this.createObject('userfields', payload);
  }

  updateUserfield(objectId, payload) {
    return this.updateObject('userfields', objectId, payload);
  }

  deleteUserfield(objectId) {
    return this.deleteObject('userfields', objectId);
  }
}

function createGrocyClientFromEnv(env) {
  return new GrocyClient({
    baseUrl: env.GROCY_URL,
    apiKey: env.GROCY_API_KEY,
  });
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/, '');
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

function hasJsonBody(body) {
  return body && typeof body === 'object' && !Buffer.isBuffer(body);
}

function formatHttpError(response, body) {
  const details = body ? `: ${body}` : '';
  return `Grocy API error ${response.status} ${response.statusText}${details}`;
}

function sanitize(text, secret) {
  const value = String(text || '');

  if (!secret) {
    return value;
  }

  return value.split(secret).join('[redacted]');
}

module.exports = {
  GrocyClient,
  createGrocyClientFromEnv,
  normalizeBaseUrl,
  normalizePath,
  sanitize,
};
