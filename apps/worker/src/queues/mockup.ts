import type { WorkerOptions } from 'bullmq';
import { handleMockupJob } from '../jobs/mockup';
import { ensureQueue } from './queue-factory';

const QUEUE_NAME = 'mockup';

export function getMockupQueue() {
  const concurrency = Number(process.env.MOCKUP_WORKER_CONCURRENCY ?? '1');
  const workerOptions: WorkerOptions = {
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 1,
  };

  return ensureQueue(QUEUE_NAME, handleMockupJob, workerOptions);
}
