import { z } from 'zod';

// TODO(config): Move to packages/config to share validation with worker & scripts.
const schema = z.object({
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3 access key id is required'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3 secret access key is required'),
  S3_BUCKET: z.string().min(1, 'S3 bucket is required'),
  S3_REGION: z.string().min(1, 'S3 region is required'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
});

export type ServerEnv = z.infer<typeof schema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = schema.safeParse({
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  });

  if (!parsed.success) {
    throw new Error('Invalid server environment variables: ' + parsed.error.message);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
