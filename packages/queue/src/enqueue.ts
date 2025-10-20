import { prisma, Prisma, JobStatus, JobType } from '@muzo/db';
import { JOB_PAYLOAD_VALIDATORS, type JobPayloadByType } from './types';

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

export const DEFAULT_MAX_ATTEMPTS = 5;

export type EnqueueJobParams<T extends JobType> = {
  type: T;
  payload: JobPayloadByType[T];
  projectId?: string;
  runAt?: Date;
  maxAttempts?: number;
};

export async function enqueueJob<T extends JobType>(
  client: PrismaClientOrTransaction,
  params: EnqueueJobParams<T>,
) {
  const validator = JOB_PAYLOAD_VALIDATORS[params.type];
  const payload = validator(params.payload);
  const availableAt = params.runAt ?? new Date();
  const maxAttempts = params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  return client.job.create({
    data: {
      type: params.type,
      status: JobStatus.PENDING,
      payload: payload as Prisma.InputJsonValue,
      projectId: params.projectId,
      availableAt,
      maxAttempts,
    },
  });
}
