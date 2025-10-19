import { Job } from 'bullmq';
import { GenerationJob } from '@muzo/queue';
import { getGenerationService } from '@muzo/ai';
import { upsertGenerationResult, updateJob, updateProject } from '@muzo/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('generation-job');

export async function handleGenerationJob(job: Job<GenerationJob>) {
  logger.info({ jobId: job.id }, 'Starting generation job');

  try {
    if (typeof job.id === 'string') {
      await updateJob(job.id, { status: 'RUNNING' });
    }

    const service = getGenerationService();
    const generationResult = await service.run(job.data);

    await upsertGenerationResult({
      projectId: generationResult.projectId,
      outputs: generationResult.outputs.map((output) => ({
        url: output.url,
        metadata: output.metadata,
      })),
      status: 'READY',
    });

    if (typeof job.id === 'string') {
      await updateJob(job.id, { status: 'DONE', result: generationResult });
    }

    logger.info({ jobId: job.id }, 'Generation job completed');
    return generationResult;
  } catch (error) {
    const projectId = job.data?.projectId;

    if (projectId) {
      try {
        await updateProject(projectId, { status: 'FAILED' });
      } catch (updateError) {
        logger.error({ err: updateError, jobId: job.id, projectId }, 'Failed to flag project as failed');
      }
    }

    if (typeof job.id === 'string') {
      await updateJob(job.id, { status: 'FAILED', result: { message: (error as Error).message } });
    }

    logger.error({ err: error, jobId: job.id, projectId }, 'Generation job failed');
    throw error;
  }
}
