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
const isDevelopment = process.env.NODE_ENV === 'development';

export async function consumeUploadRateLimit(userId: string): Promise<RateLimitResult> {
  // Bypass rate limiting in development to avoid MongoDB transaction issues
  if (isDevelopment) {
    return {
      success: true,
      limit: UPLOAD_LIMIT,
      remaining: UPLOAD_LIMIT - 1,
      reset: Math.ceil(Date.now() / 1000) + UPLOAD_WINDOW_SECONDS,
    };
  }

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

  const existing = await prisma.rateLimitWindow.findUnique({ where: { key } });

  // Check if rate limit exceeded
  if (existing && existing.expiresAt > now && existing.count >= limit) {
    return buildFailureResult(limit, existing);
  }

  // Try to increment if window is still valid and limit not reached
  if (existing && existing.expiresAt > now && existing.count < limit) {
    const result = await prisma.$runCommandRaw({
      findAndModify: 'RateLimitWindow',
      query: { key },
      update: {
        $inc: { count: 1 },
        $set: { updatedAt: now },
      },
      new: true,
    }) as { value: RateLimitWindowDocument | null };

    if (result.value) {
      return buildSuccessResult(limit, result.value);
    }
  }

  // Reset or create new window - use $runCommandRaw with proper BSON Date
  await prisma.$runCommandRaw({
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
            createdAt: now,
          },
        },
        upsert: true,
      },
    ],
  });

  // Fetch the updated/created record
  const refreshed = await prisma.rateLimitWindow.findUnique({ where: { key } });
  
  if (!refreshed) {
    throw new Error('Failed to create rate limit window');
  }

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
