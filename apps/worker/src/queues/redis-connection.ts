import { ConnectionOptions } from 'bullmq';
import { getWorkerEnv } from '../utils/env.js';

const env = getWorkerEnv();

export const redisConnection: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};
