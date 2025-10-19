import { ConnectionOptions } from 'bullmq';
import { createRedisConnectionOptions } from '@muzo/queue';
import { getWorkerEnv } from '../utils/env';

let cachedConnection: ConnectionOptions | null = null;

export function getRedisConnection(): ConnectionOptions {
  if (!cachedConnection) {
    const env = getWorkerEnv();
    cachedConnection = createRedisConnectionOptions(env.REDIS_URL);
  }

  return cachedConnection;
}
