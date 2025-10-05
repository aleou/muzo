import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './redis-connection';
import { handleMockupJob } from '../jobs/mockup';

const QUEUE_NAME = 'mockup';

let queueInstance: Queue | null = null;

export function getMockupQueue() {
  if (!queueInstance) {
    const connection = getRedisConnection();
    queueInstance = new Queue(QUEUE_NAME, { connection });

    new Worker(QUEUE_NAME, handleMockupJob, {
      connection,
      autorun: true,
    });
  }

  return queueInstance;
}