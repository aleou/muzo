import { prisma } from '@muzo/db';

const UPLOAD_WINDOW_SECONDS = 60;
const UPLOAD_LIMIT = 10;

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const transactionsEnabled = shouldEnableRateLimitTransactions();

export async function consumeUploadRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `upload:${userId}`;
  return consumeRateLimit(key, UPLOAD_LIMIT, UPLOAD_WINDOW_SECONDS);
}

async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();

  if (!transactionsEnabled) {
    return consumeRateLimitWithoutTransactions({ key, limit, windowSeconds, now });
  }

  try {
    return await consumeRateLimitWithTransactions({ key, limit, windowSeconds, now });
  } catch (error) {
    if (isReplicaSetRequiredError(error)) {
      return consumeRateLimitWithoutTransactions({ key, limit, windowSeconds, now });
    }

    throw error;
  }
}

async function consumeRateLimitWithTransactions(params: {
  key: string;
  limit: number;
  windowSeconds: number;
  now: Date;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds, now } = params;
  const windowMs = windowSeconds * 1000;
  const resetAt = new Date(now.getTime() + windowMs);

  const updated = await prisma.rateLimitWindow.updateMany({
    where: {
      key,
      expiresAt: { gt: now },
      count: { lt: limit },
    },
    data: {
      count: { increment: 1 },
      updatedAt: now,
    },
  });

  if (updated.count === 1) {
    const window = await prisma.rateLimitWindow.findUniqueOrThrow({ where: { key } });
    return buildSuccessResult(limit, window);
  }

  const existing = await prisma.rateLimitWindow.findUnique({ where: { key } });

  if (!existing || existing.expiresAt <= now) {
    const refreshed = await prisma.rateLimitWindow.upsert({
      where: { key },
      update: {
        count: 1,
        expiresAt: resetAt,
        updatedAt: now,
      },
      create: {
        key,
        count: 1,
        expiresAt: resetAt,
      },
    });

    return buildSuccessResult(limit, refreshed);
  }

  return buildFailureResult(limit, existing);
}

async function consumeRateLimitWithoutTransactions(params: {
  key: string;
  limit: number;
  windowSeconds: number;
  now: Date;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds, now } = params;
  const windowMs = windowSeconds * 1000;
  const resetAt = new Date(now.getTime() + windowMs);
  const rawClient = prisma as unknown as {
    $runCommandRaw?: (command: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };

  if (typeof rawClient.$runCommandRaw !== 'function') {
    throw new Error('MongoDB raw command interface not available');
  }

  const existing = await prisma.rateLimitWindow.findUnique({ where: { key } });

  if (existing && existing.expiresAt > now && existing.count >= limit) {
    return buildFailureResult(limit, existing);
  }

  if (existing && existing.expiresAt > now) {
    const increment = await rawClient.$runCommandRaw({
      findAndModify: 'RateLimitWindow',
      query: {
        key,
        expiresAt: { $gt: now },
        count: { $lt: limit },
      },
      update: {
        $inc: { count: 1 },
        $set: { updatedAt: now },
      },
      new: true,
    });

    const value = (increment.value ?? null) as RateLimitWindowDocument | null;

    if (value) {
      return buildSuccessResult(limit, value);
    }

    // If the increment failed because the limit was reached concurrently, fall back to failure using latest state.
    const latest = await prisma.rateLimitWindow.findUnique({ where: { key } });
    if (latest) {
      return buildFailureResult(limit, latest);
    }
  }

  await rawClient.$runCommandRaw({
    update: 'RateLimitWindow',
    updates: [
      {
        q: { key },
        u: {
          $set: {
            key,
            count: 1,
            expiresAt: resetAt,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: existing?.createdAt ?? now,
          },
        },
        upsert: true,
        multi: false,
      },
    ],
  });

  const refreshed = await prisma.rateLimitWindow.findUniqueOrThrow({ where: { key } });
  return buildSuccessResult(limit, refreshed);
}

function buildSuccessResult(limit: number, window: RateLimitWindowDocument): RateLimitResult {
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - window.count),
    reset: toUnixSeconds(window.expiresAt),
  };
}

function buildFailureResult(limit: number, window: RateLimitWindowDocument): RateLimitResult {
  return {
    success: false,
    limit,
    remaining: Math.max(0, limit - window.count),
    reset: toUnixSeconds(window.expiresAt),
  };
}

function toUnixSeconds(date: Date) {
  return Math.ceil(date.getTime() / 1000);
}

function isReplicaSetRequiredError(error: unknown): error is { code?: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in (error as Record<string, unknown>) &&
      (error as { code?: unknown }).code === 'P2031',
  );
}

function shouldEnableRateLimitTransactions() {
  const explicit = process.env.RATE_LIMIT_TRANSACTIONS?.toLowerCase();

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
      return true;
    }
  } catch {
    // Ignore malformed URLs, keep default.
  }

  return true;
}

type RateLimitWindowDocument = {
  key: string;
  count: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
