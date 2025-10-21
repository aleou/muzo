import { JobType } from '@muzo/db';
import type { FulfillmentJob, QueueJob } from '@muzo/queue';
import { getFulfillmentProvider } from '@muzo/fulfillment';
import { createLogger } from '../utils/logger';
import { prisma } from '@muzo/db';

const logger = createLogger('fulfillment-job');

export async function handleFulfillmentJob(job: QueueJob<typeof JobType.FULFILLMENT>) {
  logger.info({ jobId: job.id, payload: job.data }, 'Starting fulfillment job');

  try {
    // Get fulfillment provider (CloudPrinter/Printful/Printify)
    const provider = await getFulfillmentProvider(job.data.provider);
    logger.info({ provider: job.data.provider }, 'Fulfillment provider initialized');

    // Create order with provider
    const result = await provider.createOrder({ 
      ...job.data.order, 
      provider: job.data.provider 
    });
    
    logger.info(
      { 
        jobId: job.id, 
        providerOrderId: result.providerOrderId,
        orderId: job.data.order.orderId,
      }, 
      'Fulfillment order created with provider'
    );

    // Update order in database with provider order ID
    await prisma.order.update({
      where: { id: job.data.order.orderId },
      data: {
        providerOrderId: result.providerOrderId,
        status: 'SENT', // Order sent to fulfillment provider
      },
    });

    logger.info({ jobId: job.id }, 'Fulfillment job completed successfully');
    
    return {
      success: true,
      providerOrderId: result.providerOrderId,
      orderId: job.data.order.orderId,
    };
  } catch (error) {
    logger.error(
      { 
        err: error, 
        jobId: job.id,
        orderId: job.data?.order?.orderId,
        provider: job.data?.provider,
      }, 
      'Fulfillment job failed'
    );
    throw error;
  }
}
