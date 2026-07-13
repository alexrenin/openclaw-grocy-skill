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
    const response = await this.fetchImpl(`${this.baseUrl}${normalizePath(path)}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'GROCY-API-KEY': this.apiKey,
        ...(options.headers || {}),
      },
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

  getQuantityUnits() {
    return this.request('/api/objects/quantity_units');
  }

  getShoppingList() {
    return this.request('/api/objects/shopping_list');
  }

  getStock() {
    return this.request('/api/stock');
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
