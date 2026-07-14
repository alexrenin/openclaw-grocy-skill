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

  getShoppingList() {
    return this.request('/api/objects/shopping_list');
  }

  getStock() {
    return this.request('/api/stock');
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

  createProduct(payload) {
    return this.createObject('products', payload);
  }

  createRecipe(payload) {
    return this.createObject('recipes', payload);
  }

  createRecipePosition(payload) {
    return this.createObject('recipes_pos', payload);
  }

  updateRecipePosition(objectId, payload) {
    return this.updateObject('recipes_pos', objectId, payload);
  }

  createQuantityUnit(payload) {
    return this.createObject('quantity_units', payload);
  }

  createQuantityUnitConversion(payload) {
    return this.createObject('quantity_unit_conversions', payload);
  }

  createUserfield(payload) {
    return this.createObject('userfields', payload);
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
