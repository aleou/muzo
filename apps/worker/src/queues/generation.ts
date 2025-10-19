import type { WorkerOptions } from 'bullmq';
import { handleGenerationJob } from '../jobs/generation';
import { ensureQueue } from './queue-factory';

const QUEUE_NAME = 'generation';

export function getGenerationQueue() {
  const concurrency = Number(process.env.GENERATION_WORKER_CONCURRENCY ?? '1');
  const workerOptions: WorkerOptions = {
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 1,
  };

  return ensureQueue(QUEUE_NAME, handleGenerationJob, workerOptions);
}
