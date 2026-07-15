'use strict';

const { parseBooleanInt } = require('./product-update');
const {
  parseItemId,
  summarizeItem,
} = require('./shopping-list-write');

async function runShoppingListDoneCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for shopping-list-done: ${format}`);
  }

  const itemId = parseItemId(options['item-id']);
  const done = options.done == null || options.done === ''
    ? 1
    : parseBooleanInt(options.done, '--done');
  const [item, products, quantityUnits] = await Promise.all([
    client.getShoppingListItem(itemId),
    client.getProducts(),
    client.getQuantityUnits(),
  ]);
  const payload = { done };
  const result = await client.updateShoppingListItem(itemId, payload);

  return JSON.stringify({
    action: done === 1 ? 'marked_done' : 'marked_undone',
    entity: 'shopping_list',
    item: summarizeItem(item, products, quantityUnits),
    payload,
    result,
  }, null, 2);
}

module.exports = {
  runShoppingListDoneCommand,
};
