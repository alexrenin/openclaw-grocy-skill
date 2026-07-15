'use strict';

const {
  buildMenuPlan,
  formatMenuCheckText,
} = require('./menu-planning');

async function runMenuCheckCommand({ client, format, options }) {
  const plan = await buildMenuPlan({ client, options });

  if (format === 'json') {
    return JSON.stringify(plan, null, 2);
  }

  if (format === 'text') {
    return formatMenuCheckText(plan);
  }

  throw new Error(`Unsupported format for menu-check: ${format}`);
}

module.exports = {
  runMenuCheckCommand,
};