import { JobStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma-client.js';

type JobTypeValue = 'GENERATION' | 'MOCKUP' | 'FULFILLMENT';

export function createJob(data: Prisma.JobCreateInput) {
  return prisma.job.create({ data });
}

export function updateJob(id: string, data: Prisma.JobUpdateInput) {
  return prisma.job.update({ where: { id }, data });
}

export function findStalledJobs(type: JobTypeValue) {
  return prisma.job.findMany({ where: { type, status: JobStatus.PENDING } });
}
