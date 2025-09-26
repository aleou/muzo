import { Queue, Worker } from 'bullmq';
import { redisConnection } from './redis-connection.js';
import { handleMockupJob } from '../jobs/mockup.js';

const QUEUE_NAME = 'mockup';

let queueInstance: Queue | null = null;

export function getMockupQueue() {
  if (!queueInstance) {
    queueInstance = new Queue(QUEUE_NAME, { connection: redisConnection });

    new Worker(QUEUE_NAME, handleMockupJob, {
      connection: redisConnection,
      autorun: true,
    });
  }

  return queueInstance;
}
