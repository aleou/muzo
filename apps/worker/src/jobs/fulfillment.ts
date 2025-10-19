import { Job } from 'bullmq';
import { FulfillmentJob } from '@muzo/queue';
import { getFulfillmentProvider } from '@muzo/fulfillment';
import { createLogger } from '../utils/logger';

const logger = createLogger('fulfillment-job');

export async function handleFulfillmentJob(job: Job<FulfillmentJob>) {
  logger.info({ jobId: job.id }, 'Starting fulfillment job');

  try {
    const provider = await getFulfillmentProvider(job.data.provider);
    const result = await provider.createOrder({ ...job.data.order, provider: job.data.provider });
    logger.info({ jobId: job.id }, 'Fulfillment job completed');
    return result;
  } catch (error) {
    logger.error({ err: error, jobId: job.id }, 'Fulfillment job failed');
    throw error;
  }
}
