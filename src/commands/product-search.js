'use strict';

const { formatTable } = require('../format-table');
const { normalizeProducts } = require('./products');

async function runProductSearchCommand({ client, format, options }) {
  const query = String(options.name || '').trim();

  if (!query) {
    throw new Error('Missing required option: --name');
  }

  const [products, quantityUnits] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
  ]);

  const rows = searchProducts({
    products,
    quantityUnits,
    query,
  });

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  return formatTable(rows, [
    { key: 'id', label: 'id' },
    { key: 'name', label: 'name' },
    { key: 'description', label: 'description' },
    { key: 'stock_unit', label: 'stock_unit' },
    { key: 'purchase_unit', label: 'purchase_unit' },
    { key: 'match_score', label: 'score' },
    { key: 'match_reason', label: 'match' },
  ]);
}

function searchProducts({ products, quantityUnits, query }) {
  const quantityUnitsById = mapById(quantityUnits);
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenize(normalizedQuery);

  if (!normalizedQuery) {
    return [];
  }

  return normalizeProducts(products, quantityUnitsById)
    .map((product) => {
      const match = scoreProduct(product, normalizedQuery, queryTokens);

      if (!match) {
        return null;
      }

      return {
        ...product,
        match_score: match.score,
        match_reason: match.reason,
      };
    })
    .filter(Boolean)
    .sort(compareMatches);
}

function scoreProduct(product, normalizedQuery, queryTokens) {
  const normalizedName = normalizeSearchText(product.name);
  const normalizedDescription = normalizeSearchText(product.description);
  const haystack = normalizeSearchText(`${product.name} ${product.description}`);

  if (!normalizedName) {
    return null;
  }

  if (normalizedName === normalizedQuery) {
    return { score: 100, reason: 'exact_name' };
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return { score: 90, reason: 'name_prefix' };
  }

  if (normalizedName.includes(normalizedQuery)) {
    return { score: 85, reason: 'name_contains' };
  }

  if (queryTokens.length > 0 && queryTokens.every((token) => normalizedName.includes(token))) {
    return { score: 80, reason: 'all_terms_in_name' };
  }

  if (queryTokens.length > 0 && queryTokens.every((token) => haystack.includes(token))) {
    return { score: 70, reason: 'all_terms' };
  }

  if (normalizedDescription && normalizedDescription.includes(normalizedQuery)) {
    return { score: 60, reason: 'description_contains' };
  }

  const significantTokens = queryTokens.filter((token) => token.length >= 2);
  const matchedTokenCount = significantTokens.filter((token) => haystack.includes(token)).length;

  if (matchedTokenCount === 0) {
    return null;
  }

  const overlap = matchedTokenCount / significantTokens.length;
  return {
    score: Math.round(30 + overlap * 30),
    reason: 'partial_terms',
  };
}

function compareMatches(left, right) {
  if (right.match_score !== left.match_score) {
    return right.match_score - left.match_score;
  }

  return String(left.name).localeCompare(String(right.name), 'ru');
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLocaleLowerCase('ru')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(value) {
  return value.split(' ').filter(Boolean);
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  runProductSearchCommand,
  searchProducts,
  normalizeSearchText,
};
