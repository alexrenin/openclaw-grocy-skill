'use strict';

const {
  buildMenuPlanRecommendations,
  formatMenuPlanText,
} = require('./menu-planning');

async function runMenuPlanCommand({ client, format, options }) {
  const recommendations = await buildMenuPlanRecommendations({ client, options });

  if (format === 'json') {
    return JSON.stringify(recommendations, null, 2);
  }

  if (format === 'text') {
    return formatMenuPlanText(recommendations);
  }

  throw new Error(`Unsupported format for menu-plan: ${format}`);
}

module.exports = {
  runMenuPlanCommand,
};
