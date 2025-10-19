import { getGenerationQueue } from './generation';
import { getMockupQueue } from './mockup';
import { getFulfillmentQueue } from './fulfillment';
import { createLogger } from '../utils/logger';

export async function initQueues() {
  const logger = createLogger('queue-init');
  const enabledQueues = resolveEnabledQueues();

  const startPromises: Array<Promise<unknown>> = [];

  if (enabledQueues.has('generation')) {
    const queue = getGenerationQueue();
    startPromises.push(queue.waitUntilReady());
  } else {
    logger.info('Skipping generation queue startup (disabled by WORKER_QUEUES)');
  }

  if (enabledQueues.has('mockup')) {
    const queue = getMockupQueue();
    startPromises.push(queue.waitUntilReady());
  } else {
    logger.info('Skipping mockup queue startup (disabled by WORKER_QUEUES)');
  }

  if (enabledQueues.has('fulfillment')) {
    const queue = getFulfillmentQueue();
    startPromises.push(queue.waitUntilReady());
  } else {
    logger.info('Skipping fulfillment queue startup (disabled by WORKER_QUEUES)');
  }

  await Promise.all(startPromises);
}

function resolveEnabledQueues() {
  const rawValue = process.env.WORKER_QUEUES ?? 'generation';
  const items = rawValue
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return new Set(items);
}
