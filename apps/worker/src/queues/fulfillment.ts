import { Queue, Worker } from 'bullmq';
import { redisConnection } from './redis-connection.js';
import { handleFulfillmentJob } from '../jobs/fulfillment.js';

const QUEUE_NAME = 'fulfillment';

let queueInstance: Queue | null = null;

export function getFulfillmentQueue() {
  if (!queueInstance) {
    queueInstance = new Queue(QUEUE_NAME, { connection: redisConnection });

    new Worker(QUEUE_NAME, handleFulfillmentJob, {
      connection: redisConnection,
      autorun: true,
    });
  }

  return queueInstance;
}
