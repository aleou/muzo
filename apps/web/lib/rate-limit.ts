import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

const schema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
});

type RateLimitConfig = z.infer<typeof schema>;

let limiter: Ratelimit | null = null;

function getEnv(): RateLimitConfig {
  const parsed = schema.safeParse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  if (!parsed.success) {
    throw new Error('Invalid Upstash configuration: ' + parsed.error.message);
  }

  return parsed.data;
}

export function getUploadRateLimiter() {
  if (!limiter) {
    const env = getEnv();
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'muzo:upload',
    });
  }

  return limiter;
}
