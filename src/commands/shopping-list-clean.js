'use strict';

const { parseBooleanInt } = require('./product-update');
const {
  parseListId,
  summarizeItem,
} = require('./shopping-list-write');

async function runShoppingListCleanCommand({ client, format, options }) {
  if (format !== 'json') {
    throw new Error(`Unsupported format for shopping-list-clean: ${format}`);
  }

  const listId = parseListId(options['list-id']);
  const dryRun = options['dry-run'] == null || options['dry-run'] === ''
    ? false
    : parseBooleanInt(options['dry-run'], '--dry-run') === 1;
  const [shoppingList, products, quantityUnits] = await Promise.all([
    client.getShoppingList(),
    client.getProducts(),
    client.getQuantityUnits(),
  ]);
  const completedItems = (shoppingList || []).filter((item) => {
    return Number(item.shopping_list_id ?? 1) === listId
      && (Number(item.done) === 1 || item.done === true);
  });
  const payload = {
    list_id: listId,
    done_only: true,
  };
  const result = dryRun ? null : await client.clearShoppingList(payload);

  return JSON.stringify({
    action: dryRun ? 'preview_done_items' : 'cleaned_done_items',
    entity: 'shopping_list',
    dry_run: dryRun,
    list_id: listId,
    deleted_count: completedItems.length,
    deleted_items: completedItems.map((item) => summarizeItem(item, products, quantityUnits)),
    payload,
    result,
  }, null, 2);
}

module.exports = {
  runShoppingListCleanCommand,
};
