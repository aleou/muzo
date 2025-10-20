import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export async function getSignedS3ObjectUrl(
  key: string,
  options: { expiresIn?: number } = {},
): Promise<string> {
  const env = getServerEnv();
  const sanitizedKey = key.replace(/^\/+/, '');

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: sanitizedKey,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: options.expiresIn ?? 3600,
  });
}

export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const env = getServerEnv();
    const parsed = new URL(url);
    const cleanPath = (value: string) => value.replace(/^\/+/, '');
    const decode = (value: string) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    if (env.S3_ENDPOINT) {
      const endpoint = new URL(env.S3_ENDPOINT);
      const endpointHost = endpoint.hostname;
      const virtualHost = `${env.S3_BUCKET}.${endpointHost}`;

      if (parsed.hostname === endpointHost) {
        const path = cleanPath(parsed.pathname);
        if (path.startsWith(`${env.S3_BUCKET}/`)) {
          return decode(path.slice(env.S3_BUCKET.length + 1));
        }
        return decode(path);
      }

      if (parsed.hostname === virtualHost) {
        return decode(cleanPath(parsed.pathname));
      }
    }

    const awsVirtualHost = `${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;
    if (parsed.hostname === awsVirtualHost) {
      return decode(cleanPath(parsed.pathname));
    }

    const genericPath = cleanPath(parsed.pathname);
    if (genericPath.startsWith(`${env.S3_BUCKET}/`)) {
      return decode(genericPath.slice(env.S3_BUCKET.length + 1));
    }

    return null;
  } catch {
    return null;
  }
}
