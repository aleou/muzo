import { Queue, Worker } from 'bullmq';
import { redisConnection } from './redis-connection.js';
import { handleGenerationJob } from '../jobs/generation.js';

const QUEUE_NAME = 'generation';

let queueInstance: Queue | null = null;

export function getGenerationQueue() {
  if (!queueInstance) {
    queueInstance = new Queue(QUEUE_NAME, { connection: redisConnection });

    new Worker(QUEUE_NAME, handleGenerationJob, {
      connection: redisConnection,
      autorun: true,
    });
  }

  return queueInstance;
}
