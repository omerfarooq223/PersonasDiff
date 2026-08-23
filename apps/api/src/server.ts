import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';
import { loadConfig } from './config.js';

for (const envFile of ['../../../.env', '../../../.env.local']) {
  try {
    loadEnvFile(fileURLToPath(new URL(envFile, import.meta.url)));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
}

const config = loadConfig();
const app = await buildApp(config);

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
