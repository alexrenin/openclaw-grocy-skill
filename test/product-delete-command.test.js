'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildProductDeletePlan,
  findProductDeleteBlockers,
  runProductDeleteCommand,
} = require('../src/commands/product-delete');

const product = {
  id: 42,
  name: 'Milk',
};

test('builds product delete plan when product is unused', () => {
  const plan = buildProductDeletePlan({
    productId: 42,
    product,
    stock: [],
    recipePositions: [],
    shoppingList: [],
    confirmProductName: 'Milk',
  });

  assert.deepEqual(plan, {
    product: {
      id: 42,
      name: 'Milk',
    },
    checks: {
      stock: 'zero',
      recipe_positions: 'none',
      shopping_list: 'none',
    },
  });
});

test('rejects product delete when confirmation name does not match', () => {
  assert.throws(
    () => buildProductDeletePlan({
      productId: 42,
      product,
      stock: [],
      recipePositions: [],
      shoppingList: [],
      confirmProductName: 'Yogurt',
    }),
    /--confirm-product-name does not match product 42:Milk/,
  );
});

test('finds product delete blockers', () => {
  assert.deepEqual(findProductDeleteBlockers({
    productId: 42,
    stock: [
      { product_id: 42, amount: '1.5' },
    ],
    recipePositions: [
      { id: 8, product_id: 42 },
    ],
    shoppingList: [
      { id: 9, product_id: 42 },
    ],
  }), [
    'stock amount is 1.5',
    'used by recipe ingredient rows 8',
    'used by shopping list rows 9',
  ]);
});

test('rejects product delete when product is still in use', () => {
  assert.throws(
    () => buildProductDeletePlan({
      productId: 42,
      product,
      stock: [
        { product_id: 42, amount: '1' },
      ],
      recipePositions: [],
      shoppingList: [],
    }),
    /Fallback: ask for confirmation to deactivate it with product-update/,
  );
});

test('runs product-delete json command', async () => {
  let deletedProductId;
  const output = await runProductDeleteCommand({
    format: 'json',
    options: {
      'product-id': '42',
      'confirm-product-name': 'Milk',
    },
    client: {
      getObject: async (entity, objectId) => {
        assert.equal(entity, 'products');
        assert.equal(objectId, 42);
        return product;
      },
      getStock: async () => [],
      getRecipePositions: async () => [],
      getShoppingList: async () => [],
      deleteProduct: async (productId) => {
        deletedProductId = productId;
        return null;
      },
    },
  });

  assert.equal(deletedProductId, 42);
  assert.equal(output, JSON.stringify({
    action: 'deleted',
    entity: 'products',
    product: {
      id: 42,
      name: 'Milk',
    },
    checks: {
      stock: 'zero',
      recipe_positions: 'none',
      shopping_list: 'none',
    },
    result: null,
  }, null, 2));
});
