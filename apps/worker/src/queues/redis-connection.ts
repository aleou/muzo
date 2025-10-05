import { ConnectionOptions } from 'bullmq';
import { getWorkerEnv } from '../utils/env';

let cachedConnection: ConnectionOptions | null = null;

export function getRedisConnection(): ConnectionOptions {
  if (!cachedConnection) {
    const env = getWorkerEnv();
    const parsed = new URL(env.REDIS_URL);
    const isSecure = parsed.protocol === 'rediss:';

    cachedConnection = {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : undefined,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: isSecure ? {} : undefined,
      maxRetriesPerRequest: null,
    } satisfies ConnectionOptions;
  }

  return cachedConnection;
}