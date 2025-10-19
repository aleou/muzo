import { JobStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma-client';

type JobTypeValue = 'GENERATION' | 'MOCKUP' | 'FULFILLMENT';

// TODO(queue): Replace direct Job mutations with idempotent enqueue helper using packages/queue + outbox linkage.
export function createJob(data: Prisma.JobCreateInput) {
  return prisma.job.create({ data });
}

export function updateJob(id: string, data: Prisma.JobUpdateInput) {
  return prisma.job.update({ where: { id }, data });
}

export function findStalledJobs(type: JobTypeValue) {
  return prisma.job.findMany({ where: { type, status: JobStatus.PENDING } });
}
