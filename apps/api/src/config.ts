export type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

export interface ApiConfig {
  appEnv: AppEnvironment;
  host: string;
  logLevel: string;
  port: number;
  releaseSha: string;
}

const validEnvironments = new Set<AppEnvironment>(['development', 'staging', 'production', 'test']);

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const appEnv = env.APP_ENV ?? 'development';
  if (!validEnvironments.has(appEnv as AppEnvironment)) {
    throw new Error(`APP_ENV is invalid: ${appEnv}`);
  }

  return {
    appEnv: appEnv as AppEnvironment,
    host: env.API_HOST ?? '0.0.0.0',
    logLevel: env.LOG_LEVEL ?? 'info',
    port: parsePort(env.API_PORT),
    releaseSha: env.RELEASE_SHA ?? 'local',
  };
}
