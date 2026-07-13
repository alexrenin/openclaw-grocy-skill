'use strict';

const { formatTable } = require('../format-table');

async function runProductsCommand({ client, format }) {
  const [products, quantityUnits] = await Promise.all([
    client.getProducts(),
    client.getQuantityUnits(),
  ]);

  const quantityUnitsById = mapById(quantityUnits);
  const rows = normalizeProducts(products, quantityUnitsById);

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  return formatTable(rows, [
    { key: 'id', label: 'id' },
    { key: 'name', label: 'name' },
    { key: 'description', label: 'description' },
    { key: 'stock_unit', label: 'stock_unit' },
    { key: 'purchase_unit', label: 'purchase_unit' },
  ]);
}

function normalizeProducts(products, quantityUnitsById) {
  return (products || []).map((product) => ({
    id: product.id,
    name: product.name || '',
    description: product.description || '',
    stock_unit: getUnitName(product.qu_id_stock, quantityUnitsById),
    purchase_unit: getUnitName(product.qu_id_purchase, quantityUnitsById),
  }));
}

function getUnitName(unitId, quantityUnitsById) {
  if (unitId == null || unitId === '') {
    return '';
  }

  return quantityUnitsById.get(Number(unitId))?.name || '';
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  runProductsCommand,
  normalizeProducts,
};
