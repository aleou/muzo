import { Job } from 'bullmq';
import { MockupJob } from '@muzo/queue';
import { getMockupService } from '@muzo/ai';
import { createLogger } from '../utils/logger';

const logger = createLogger('mockup-job');

export async function handleMockupJob(job: Job<MockupJob>) {
  logger.info({ jobId: job.id }, 'Starting mockup job');

  try {
    const service = getMockupService();
    const result = await service.run(job.data);
    logger.info({ jobId: job.id }, 'Mockup job completed');
    return result;
  } catch (error) {
    logger.error({ err: error, jobId: job.id }, 'Mockup job failed');
    throw error;
  }
}
