'use strict';

const {
  parseItemId,
  summarizeItem,
} = require('./shopping-list-write');

async function runShoppingListDeleteCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for shopping-list-delete: ${format}`);
  }

  const itemId = parseItemId(options['item-id']);
  const [item, products, quantityUnits] = await Promise.all([
    client.getShoppingListItem(itemId),
    client.getProducts(),
    client.getQuantityUnits(),
  ]);
  const result = await client.deleteShoppingListItem(itemId);

  return JSON.stringify({
    action: 'deleted',
    entity: 'shopping_list',
    item: summarizeItem(item, products, quantityUnits),
    result,
  }, null, 2);
}

module.exports = {
  runShoppingListDeleteCommand,
};
