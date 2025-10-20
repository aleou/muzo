import { JobType } from '@muzo/db';
import { createQueueWorker } from '@muzo/queue';
import { handleGenerationJob } from '../jobs/generation';
import { createLogger } from '../utils/logger';

export function createGenerationWorker() {
  const concurrency = resolveConcurrency(process.env.GENERATION_WORKER_CONCURRENCY);
  const logger = createLogger('generation-worker');

  return createQueueWorker({
    type: JobType.GENERATION,
    handler: handleGenerationJob,
    concurrency,
    logger,
  });
}

function resolveConcurrency(rawValue: string | undefined) {
  const parsed = Number(rawValue ?? '1');
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
}
