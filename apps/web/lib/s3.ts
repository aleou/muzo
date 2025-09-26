import { S3Client } from '@aws-sdk/client-s3';
import { getServerEnv } from './server-env';

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!client) {
    const env = getServerEnv();
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  return client;
}

export function buildPublicS3Url(key: string): string {
  const env = getServerEnv();

  if (env.S3_ENDPOINT) {
    const base = env.S3_ENDPOINT.endsWith('/') ? env.S3_ENDPOINT : `${env.S3_ENDPOINT}/`;

    if (env.S3_FORCE_PATH_STYLE) {
      return new URL(`${env.S3_BUCKET}/${key}`, base).toString();
    }

    const url = new URL(base);
    url.hostname = `${env.S3_BUCKET}.${url.hostname}`;
    return new URL(key, url).toString();
  }

  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}
