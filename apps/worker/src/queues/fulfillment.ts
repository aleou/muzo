import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './redis-connection';
import { handleFulfillmentJob } from '../jobs/fulfillment';

const QUEUE_NAME = 'fulfillment';

let queueInstance: Queue | null = null;

export function getFulfillmentQueue() {
  if (!queueInstance) {
    const connection = getRedisConnection();
    queueInstance = new Queue(QUEUE_NAME, { connection });

    new Worker(QUEUE_NAME, handleFulfillmentJob, {
      connection,
      autorun: true,
    });
  }

  return queueInstance;
}