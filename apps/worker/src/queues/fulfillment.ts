import { JobType } from '@muzo/db';
import { createQueueWorker } from '@muzo/queue';
import { handleFulfillmentJob } from '../jobs/fulfillment';
import { createLogger } from '../utils/logger';

export function createFulfillmentWorker() {
  const concurrency = resolveConcurrency(process.env.FULFILLMENT_WORKER_CONCURRENCY);
  const logger = createLogger('fulfillment-worker');

  return createQueueWorker({
    type: JobType.FULFILLMENT,
    handler: handleFulfillmentJob,
    concurrency,
    logger,
  });
}

function resolveConcurrency(rawValue: string | undefined) {
  const parsed = Number(rawValue ?? '1');
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
}
