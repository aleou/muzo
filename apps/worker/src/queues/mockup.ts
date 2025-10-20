import { JobType } from '@muzo/db';
import { createQueueWorker } from '@muzo/queue';
import { handleMockupJob } from '../jobs/mockup';
import { createLogger } from '../utils/logger';

export function createMockupWorker() {
  const concurrency = resolveConcurrency(process.env.MOCKUP_WORKER_CONCURRENCY);
  const logger = createLogger('mockup-worker');

  return createQueueWorker({
    type: JobType.MOCKUP,
    handler: handleMockupJob,
    concurrency,
    logger,
  });
}

function resolveConcurrency(rawValue: string | undefined) {
  const parsed = Number(rawValue ?? '1');
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
}
