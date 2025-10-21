import { prisma } from '@muzo/db';
import { JobType } from '@prisma/client';

type EnqueueJobParams = {
  type: JobType;
  payload: any;
  projectId?: string;
  availableAt?: Date;
};

/**
 * Enqueue a job in the MongoDB queue
 * Creates a Job document that will be picked up by the worker
 */
export async function enqueueJob({
  type,
  payload,
  projectId,
  availableAt = new Date(),
}: EnqueueJobParams) {
  const job = await prisma.job.create({
    data: {
      type,
      status: 'PENDING',
      payload,
      projectId,
      availableAt,
      attempts: 0,
      maxAttempts: 3,
    },
  });

  console.log('[queue] Job enqueued:', {
    jobId: job.id,
    type: job.type,
    projectId: job.projectId,
  });

  return job;
}
