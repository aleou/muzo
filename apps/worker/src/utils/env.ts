import { z } from 'zod';

const schema = z.object({
  REDIS_URL: z.string().url(),
  RUNPOD_API_KEY: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  STRIPE_SECRET_KEY: z.string().min(1),
  PRINTFUL_API_KEY: z.string().optional(),
  PRINTIFY_API_KEY: z.string().optional(),
});

export type WorkerEnv = z.infer<typeof schema>;

export function getWorkerEnv(): WorkerEnv {
  const parsed = schema.safeParse({
    REDIS_URL: process.env.REDIS_URL,
    RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    PRINTFUL_API_KEY: process.env.PRINTFUL_API_KEY,
    PRINTIFY_API_KEY: process.env.PRINTIFY_API_KEY,
  });

  if (!parsed.success) {
    throw new Error('Invalid worker environment variables: ' + parsed.error.message);
  }

  return parsed.data;
}
