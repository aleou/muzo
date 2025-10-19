import type { WorkerOptions } from 'bullmq';
import { handleFulfillmentJob } from '../jobs/fulfillment';
import { ensureQueue } from './queue-factory';

const QUEUE_NAME = 'fulfillment';

export function getFulfillmentQueue() {
  const concurrency = Number(process.env.FULFILLMENT_WORKER_CONCURRENCY ?? '1');
  const workerOptions: WorkerOptions = {
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 1,
  };

  return ensureQueue(QUEUE_NAME, handleFulfillmentJob, workerOptions);
}
