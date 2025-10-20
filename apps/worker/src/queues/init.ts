import { createGenerationWorker } from './generation';
import { createMockupWorker } from './mockup';
import { createFulfillmentWorker } from './fulfillment';
import { createLogger } from '../utils/logger';
import type { QueueWorkerControl } from '@muzo/queue';

const activeWorkers: QueueWorkerControl[] = [];

export async function initQueues() {
  await shutdownQueues();

  const logger = createLogger('queue-init');
  const enabledQueues = resolveEnabledQueues();

  const plannedWorkers: Array<{ name: string; control: QueueWorkerControl }> = [];

  if (enabledQueues.has('generation')) {
    plannedWorkers.push({ name: 'generation', control: createGenerationWorker() });
  } else {
    logger.info('Skipping generation queue startup (disabled by WORKER_QUEUES)');
  }

  if (enabledQueues.has('mockup')) {
    plannedWorkers.push({ name: 'mockup', control: createMockupWorker() });
  } else {
    logger.info('Skipping mockup queue startup (disabled by WORKER_QUEUES)');
  }

  if (enabledQueues.has('fulfillment')) {
    plannedWorkers.push({ name: 'fulfillment', control: createFulfillmentWorker() });
  } else {
    logger.info('Skipping fulfillment queue startup (disabled by WORKER_QUEUES)');
  }

  for (const worker of plannedWorkers) {
    await worker.control.start();
    activeWorkers.push(worker.control);
    logger.info({ queue: worker.name }, 'Queue worker started');
  }
}

export async function shutdownQueues() {
  if (activeWorkers.length === 0) {
    return;
  }

  const workers = activeWorkers.splice(0, activeWorkers.length);
  await Promise.all(workers.map((worker) => worker.stop().catch(() => undefined)));
}

function resolveEnabledQueues() {
  const rawValue = process.env.WORKER_QUEUES ?? 'generation';
  const items = rawValue
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return new Set(items);
}
