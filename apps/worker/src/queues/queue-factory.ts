import { Queue, Worker, type Processor, type WorkerOptions } from 'bullmq';
import { isRedisRateLimitError } from '@muzo/queue';
import { createLogger } from '../utils/logger';
import { getRedisConnection } from './redis-connection';

type RegisteredQueue = {
  queue: Queue;
  worker: Worker;
};

const registry = new Map<string, RegisteredQueue>();

const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_STALLED_INTERVAL_MS = 60 * 1000; // 60 seconds

export function ensureQueue<T>(
  name: string,
  processor: Processor<T>,
  options: WorkerOptions = {},
) {
  const existing = registry.get(name);
  if (existing) {
    return existing.queue;
  }

  const connection = getRedisConnection();
  const queue = new Queue(name, { connection });

  const worker = new Worker(name, processor, {
    connection,
    autorun: true,
    ...(options ?? {}),
    settings: {
      stalledInterval: getStalledInterval(),
      ...(options?.settings ?? {}),
    },
  });

  attachWorkerGuards(name, worker);

  registry.set(name, { queue, worker });
  return queue;
}

function attachWorkerGuards(queueName: string, worker: Worker) {
  const logger = createLogger(`${queueName}-worker`);
  const cooldownMs = getRateLimitCooldown();
  let pausedDueToRateLimit = false;
  let resumeTimer: NodeJS.Timeout | null = null;

  worker.on('error', (error) => {
    if (isRedisRateLimitError(error)) {
      if (!pausedDueToRateLimit) {
        pausedDueToRateLimit = true;
        logger.warn(
          { queue: queueName, cooldownMs },
          'Redis rate limit reached. Pausing worker until cooldown elapses.',
        );

        void worker.pause(true).catch((pauseError) => {
          logger.error({ err: pauseError }, 'Failed to pause worker after rate limit error');
        });
      }

      if (!resumeTimer) {
        resumeTimer = setTimeout(() => {
          resumeTimer = null;
          pausedDueToRateLimit = false;
          logger.info({ queue: queueName }, 'Resuming worker after rate limit cooldown');
          void worker.resume(true).catch((resumeError) => {
            pausedDueToRateLimit = true;
            logger.error({ err: resumeError }, 'Failed to resume worker after cooldown');
          });
        }, cooldownMs);
      }

      return;
    }

    logger.error({ err: error }, 'Worker error');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        err: error,
      },
      'Worker job failed',
    );
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Worker detected stalled job');
  });
}
function getRateLimitCooldown() {
  const envValue = process.env.QUEUE_RATE_LIMIT_COOLDOWN_MS;
  if (!envValue) {
    return DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  }

  const parsed = Number(envValue);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return DEFAULT_RATE_LIMIT_COOLDOWN_MS;
}

function getStalledInterval() {
  const envValue = process.env.QUEUE_STALLED_CHECK_INTERVAL_MS;
  if (!envValue) {
    return DEFAULT_STALLED_INTERVAL_MS;
  }

  const parsed = Number(envValue);
  if (Number.isFinite(parsed) && parsed >= 1000) {
    return parsed;
  }

  return DEFAULT_STALLED_INTERVAL_MS;
}
