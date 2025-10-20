import { randomUUID } from 'node:crypto';

import { prisma, Prisma, JobStatus, JobType } from '@muzo/db';
import { isFatalJobError } from './errors';
import { DEFAULT_MAX_ATTEMPTS } from './enqueue';
import { JOB_PAYLOAD_VALIDATORS, type JobPayloadByType, type QueueJob } from './types';

type Logger = {
  debug?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

export type QueueWorkerOptions<T extends JobType> = {
  type: T;
  handler: (job: QueueJob<T>) => Promise<unknown>;
  concurrency?: number;
  pollIntervalMs?: number;
  lockDurationMs?: number;
  logger?: Logger;
  client?: PrismaClientOrTransaction;
};

export type QueueWorkerControl = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_LOCK_DURATION_MS = 5 * 60 * 1000;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export function createQueueWorker<T extends JobType>(options: QueueWorkerOptions<T>): QueueWorkerControl {
  const {
    type,
    handler,
    concurrency = 1,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    lockDurationMs = DEFAULT_LOCK_DURATION_MS,
    logger,
  } = options;

  if (concurrency <= 0) {
    throw new Error(`Concurrency must be >= 1 (received ${concurrency})`);
  }

  const workerId = `${type.toLowerCase()}-${randomUUID()}`;
  const client = options.client ?? prisma;
  let running = false;
  let stopRequested = false;
  let loops: Array<Promise<void>> = [];
  let transactionsEnabled = shouldEnableTransactionsByDefault();
  let transactionsWarningLogged = false;

  function disableTransactions(error?: unknown) {
    if (!transactionsEnabled) {
      return;
    }

    transactionsEnabled = false;

    if (transactionsWarningLogged) {
      return;
    }

    transactionsWarningLogged = true;

    if (error) {
      logger?.warn?.(
        { workerId, err: error },
        'Mongo replica set not available; falling back to non-transactional queue mode',
      );
    } else {
      logger?.warn?.(
        { workerId },
        'Mongo replica set not available; falling back to non-transactional queue mode',
      );
    }
  }

  async function releaseStaleJobs(now: Date) {
    let released = 0;

    if (transactionsEnabled) {
      try {
        const result = await client.job.updateMany({
          where: {
            type,
            status: JobStatus.RUNNING,
            lockedUntil: { lte: now },
          },
          data: {
            status: JobStatus.PENDING,
            lockedAt: null,
            lockedUntil: null,
            lockedBy: null,
          },
        });
        released = result.count;
      } catch (error) {
        if (isReplicaSetRequiredError(error)) {
          disableTransactions(error);
          released = await releaseStaleJobsWithoutReplica(client, type, now);
        } else {
          throw error;
        }
      }
    } else {
      released = await releaseStaleJobsWithoutReplica(client, type, now);
    }

    if (released > 0) {
      logger?.warn?.({ workerId, released }, 'Released stale jobs');
    }
  }

  async function reserveJob(): Promise<QueueJob<T> | null> {
    const now = new Date();
    await releaseStaleJobs(now);

    const job = await client.job.findFirst({
      where: {
        type,
        status: JobStatus.PENDING,
        availableAt: { lte: now },
      },
      orderBy: [
        { availableAt: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (!job) {
      return null;
    }

    if (job.maxAttempts !== null && job.attempts >= job.maxAttempts) {
      await client.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          lastError: {
            message: 'Maximum attempts exhausted',
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
          } as Prisma.InputJsonValue,
        },
      });
      logger?.error?.({ jobId: job.id }, 'Job reached max attempts without processing');
      return null;
    }

    const lockUntil = new Date(now.getTime() + lockDurationMs);

    let updated = 0;

    if (transactionsEnabled) {
      try {
        const updateResult = await client.job.updateMany({
          where: {
            id: job.id,
            status: JobStatus.PENDING,
            attempts: job.attempts,
          },
          data: {
            status: JobStatus.RUNNING,
            attempts: { increment: 1 },
            lockedAt: now,
            lockedUntil: lockUntil,
            lockedBy: workerId,
          },
        });

        updated = updateResult.count;
      } catch (error) {
        if (isReplicaSetRequiredError(error)) {
          disableTransactions(error);
          updated = await claimJobWithoutReplica(
            client,
            job.id,
            job.attempts,
            workerId,
            now,
            lockUntil,
          );
        } else {
          throw error;
        }
      }
    } else {
      updated = await claimJobWithoutReplica(
        client,
        job.id,
        job.attempts,
        workerId,
        now,
        lockUntil,
      );
    }

    if (updated === 0) {
      return null;
    }

    const validator = JOB_PAYLOAD_VALIDATORS[type];

    try {
      const payload = validator(job.payload as unknown) as JobPayloadByType[T];

      return {
        id: job.id,
        type,
        data: payload,
        attempts: job.attempts + 1,
        maxAttempts: job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        projectId: job.projectId,
      };
    } catch (error) {
      logger?.error?.({ jobId: job.id, err: error }, 'Job payload validation failed');
      await client.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          lockedAt: null,
          lockedUntil: null,
          lockedBy: null,
          lastError: serializeError(error),
        },
      });
      return null;
    }
  }

  async function completeJobSuccess(jobId: string, result: unknown) {
    const data: Prisma.JobUpdateInput = {
      status: JobStatus.DONE,
      lockedAt: null,
      lockedUntil: null,
      lockedBy: null,
      lastError: null,
    };

    if (typeof result !== 'undefined') {
      data.result = result as Prisma.InputJsonValue;
    }

    await client.job.update({
      where: { id: jobId },
      data,
    });
  }

  async function handleJobFailure(job: QueueJob<T>, error: unknown) {
    const shouldRetry = !isFatalJobError(error) && job.attempts < job.maxAttempts;
    const data: Prisma.JobUpdateInput = {
      lockedAt: null,
      lockedUntil: null,
      lockedBy: null,
      lastError: serializeError(error),
    };

    if (shouldRetry) {
      const backoffMs = computeBackoff(job.attempts);
      data.status = JobStatus.PENDING;
      data.availableAt = new Date(Date.now() + backoffMs);
      logger?.warn?.({ jobId: job.id, attempts: job.attempts, delayMs: backoffMs }, 'Retrying job after failure');
    } else {
      data.status = JobStatus.FAILED;
      logger?.error?.({ jobId: job.id, err: error }, 'Job failed permanently');
    }

    await client.job.update({
      where: { id: job.id },
      data,
    });
  }

  async function workerLoop(slot: number) {
    while (running && !stopRequested) {
      try {
        const job = await reserveJob();

        if (!job) {
          await sleep(pollIntervalMs);
          continue;
        }

        logger?.info?.({ jobId: job.id, slot, attempts: job.attempts }, 'Processing job');

        try {
          const result = await handler(job);
          await completeJobSuccess(job.id, result);
        } catch (error) {
          await handleJobFailure(job, error);
        }
      } catch (loopError) {
        logger?.error?.({ workerId, slot, err: loopError }, 'Queue worker loop error');
        await sleep(pollIntervalMs);
      }
    }
  }

  return {
    async start() {
      if (running) {
        return;
      }

      running = true;
      stopRequested = false;

    if (transactionsEnabled) {
      try {
        const supported = await detectTransactionSupport(client);
        if (!supported) {
          disableTransactions();
          logger?.info?.(
              { workerId },
              'Mongo replica set not detected; using non-transactional queue mode',
            );
          }
        } catch (error) {
          logger?.warn?.({ workerId, err: error }, 'Could not determine Mongo transaction support; continuing');
        }
      }

      loops = Array.from({ length: concurrency }, (_, index) =>
        workerLoop(index).catch((error) => {
          logger?.error?.({ workerId, slot: index, err: error }, 'Queue worker loop crashed');
        }),
      );
    },
    async stop() {
      if (!running) {
        return;
      }

      stopRequested = true;
      running = false;
      await Promise.allSettled(loops);
      loops = [];
    },
  };
}

function computeBackoff(attempt: number) {
  const exponent = Math.max(0, attempt - 1);
  const delay = BASE_BACKOFF_MS * 2 ** exponent;
  return Math.min(delay, MAX_BACKOFF_MS);
}

function serializeError(error: unknown): Prisma.InputJsonValue {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
  };
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function isReplicaSetRequiredError(error: unknown): error is { code?: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2031',
  );
}

function shouldEnableTransactionsByDefault() {
  const explicit = process.env.QUEUE_TRANSACTIONS?.toLowerCase();

  if (explicit === 'off' || explicit === 'false' || explicit === '0') {
    return false;
  }

  if (explicit === 'on' || explicit === 'true' || explicit === '1') {
    return true;
  }

  const urlString = process.env.DATABASE_URL;
  if (!urlString) {
    return true;
  }

  try {
    const parsed = new URL(urlString);
    const params = parsed.searchParams;

    if (params.get('directConnection') === 'true') {
      return false;
    }

    if (params.get('replicaSet')) {
      return true;
    }

    if (parsed.protocol === 'mongodb+srv:') {
      // SRV clusters are replica sets unless explicitly direct-connected.
      return true;
    }
  } catch {
    // Ignore malformed URLs and keep default (enabled).
  }

  return true;
}

async function detectTransactionSupport(client: PrismaClientOrTransaction): Promise<boolean> {
  const rawClient = client as unknown as {
    $runCommandRaw?: (command: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };

  if (typeof rawClient.$runCommandRaw !== 'function') {
    return true;
  }

  const commands: Array<Record<string, unknown>> = [{ hello: 1 }, { isMaster: 1 }];

  for (const command of commands) {
    try {
      const result = await rawClient.$runCommandRaw(command);
      if (result && typeof result === 'object') {
        if (
          'setName' in result ||
          'hosts' in result ||
          'topologyVersion' in result ||
          'logicalSessionTimeoutMinutes' in result
        ) {
          return true;
        }
      }
    } catch {
      // Command not supported, try the next one.
    }
  }

  return false;
}
async function claimJobWithoutReplica(
  client: PrismaClientOrTransaction,
  jobId: string,
  expectedAttempts: number,
  workerId: string,
  lockedAt: Date,
  lockedUntil: Date,
) {
  const rawClient = client as unknown as {
    $runCommandRaw?: (command: Record<string, unknown>) => Promise<unknown>;
  };

  if (typeof rawClient.$runCommandRaw !== 'function') {
    return 0;
  }

  const result = (await rawClient.$runCommandRaw({
    update: 'Job',
    updates: [
      {
        q: {
          _id: toMongoObjectId(jobId),
          status: JobStatus.PENDING,
          attempts: expectedAttempts,
        },
        u: {
          $set: {
            status: JobStatus.RUNNING,
            lockedAt: { $date: lockedAt.toISOString() },
            lockedUntil: { $date: lockedUntil.toISOString() },
            lockedBy: workerId,
          },
          $inc: { attempts: 1 },
        },
        multi: false,
      },
    ],
  })) as Record<string, unknown>;

  return extractModifiedCount(result);
}

async function releaseStaleJobsWithoutReplica(
  client: PrismaClientOrTransaction,
  type: JobType,
  now: Date,
) {
  const rawClient = client as unknown as {
    $runCommandRaw?: (command: Record<string, unknown>) => Promise<unknown>;
  };

  if (typeof rawClient.$runCommandRaw !== 'function') {
    return 0;
  }

  const result = (await rawClient.$runCommandRaw({
    update: 'Job',
    updates: [
      {
        q: {
          type,
          status: JobStatus.RUNNING,
          lockedUntil: { $lte: now },
        },
        u: {
          $set: {
            status: JobStatus.PENDING,
            lockedAt: null,
            lockedUntil: null,
            lockedBy: null,
          },
        },
        multi: true,
      },
    ],
  })) as Record<string, unknown>;

  return extractModifiedCount(result);
}

function toMongoObjectId(id: string) {
  if (typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)) {
    return { $oid: id } as const;
  }

  return id;
}

function extractModifiedCount(result: Record<string, unknown>) {
  const candidateKeys = ['modifiedCount', 'nModified', 'n'];

  for (const key of candidateKeys) {
    const value = result[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}







