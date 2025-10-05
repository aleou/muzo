import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './redis-connection';
import { handleGenerationJob } from '../jobs/generation';

const QUEUE_NAME = 'generation';

let queueInstance: Queue | null = null;

export function getGenerationQueue() {
  if (!queueInstance) {
    const connection = getRedisConnection();
    queueInstance = new Queue(QUEUE_NAME, { connection });

    new Worker(QUEUE_NAME, handleGenerationJob, {
      connection,
      autorun: true,
    });
  }

  return queueInstance;
}