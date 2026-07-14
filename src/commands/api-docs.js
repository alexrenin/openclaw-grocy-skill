'use strict';

async function runApiDocsCommand({ client, format }) {
  const systemInfo = await client.getSystemInfo();
  const grocyVersion = getGrocyVersion(systemInfo);
  const docs = buildApiDocsLinks(grocyVersion);

  if (format === 'json') {
    return JSON.stringify(docs, null, 2);
  }

  if (format === 'text') {
    return formatApiDocsLinks(docs);
  }

  throw new Error(`Unsupported format for api-docs: ${format}`);
}

function getGrocyVersion(systemInfo) {
  const version = systemInfo?.grocy_version?.Version
    ?? systemInfo?.grocy_version?.version
    ?? systemInfo?.version;

  return normalizeVersion(version);
}

function buildApiDocsLinks(grocyVersion) {
  const ref = grocyVersion ? `v${grocyVersion}` : 'master';

  return {
    grocyVersion: grocyVersion || null,
    openapi: {
      ref,
      githubUrl: `https://github.com/grocy/grocy/blob/${ref}/grocy.openapi.json`,
      rawUrl: `https://raw.githubusercontent.com/grocy/grocy/${ref}/grocy.openapi.json`,
      latestGithubUrl: 'https://github.com/grocy/grocy/blob/master/grocy.openapi.json',
    },
    guidance: [
      'Use the version-specific OpenAPI URL first.',
      'Use master only when intentionally checking upcoming Grocy behavior.',
      'Before adding or changing a Grocy API command, verify the endpoint, entity name, query parameters, response shape, and request payload fields in OpenAPI.',
    ],
  };
}

function formatApiDocsLinks(docs) {
  const version = docs.grocyVersion || 'unknown';

  return [
    'Grocy API documentation:',
    `Installed Grocy version: ${version}`,
    `Version-specific OpenAPI: ${docs.openapi.githubUrl}`,
    `Raw OpenAPI JSON: ${docs.openapi.rawUrl}`,
    `Latest OpenAPI on master: ${docs.openapi.latestGithubUrl}`,
    '',
    'Use the version-specific OpenAPI before adding or changing any Grocy API command.',
  ].join('\n');
}

function normalizeVersion(version) {
  if (version == null) {
    return '';
  }

  const value = String(version).trim();

  return /^\d+\.\d+\.\d+$/.test(value) ? value : '';
}

module.exports = {
  buildApiDocsLinks,
  formatApiDocsLinks,
  getGrocyVersion,
  runApiDocsCommand,
};
