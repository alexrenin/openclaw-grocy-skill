'use strict';

const {
  buildMenuPlan,
  buildMenuShoppingList,
  formatMenuShoppingListText,
} = require('./menu-planning');

async function runMenuShoppingListCommand({ client, format, options }) {
  const plan = await buildMenuPlan({ client, options });
  const shoppingList = buildMenuShoppingList(plan);

  if (format === 'json') {
    return JSON.stringify(shoppingList, null, 2);
  }

  if (format === 'text') {
    return formatMenuShoppingListText(plan);
  }

  throw new Error(`Unsupported format for menu-shopping-list: ${format}`);
}

module.exports = {
  runMenuShoppingListCommand,
};