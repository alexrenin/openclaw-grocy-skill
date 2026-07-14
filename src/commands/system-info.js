'use strict';

async function runSystemInfoCommand({ client, format }) {
  const systemInfo = await client.getSystemInfo();

  if (format === 'json') {
    return JSON.stringify(systemInfo, null, 2);
  }

  throw new Error(`Unsupported format for system-info: ${format}`);
}

module.exports = {
  runSystemInfoCommand,
};
