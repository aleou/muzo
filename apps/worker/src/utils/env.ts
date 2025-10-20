import { z } from 'zod';

// TODO(config): Load schema from packages/config to ensure parity with web/server environments.
const schema = z.object({
  RUNPOD_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
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

export class WorkerEnvError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super('Invalid worker environment variables');
    this.name = 'WorkerEnvError';
  }
}

export function getWorkerEnv(): WorkerEnv {
  const parsed = schema.safeParse({
    RUNPOD_API_KEY: process.env.RUNPOD_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
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
    throw new WorkerEnvError(parsed.error.issues);
  }

  return parsed.data;
}
