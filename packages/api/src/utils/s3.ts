import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// These environment variables should be provided by the consuming application
function getS3Config() {
  return {
    region: process.env.S3_REGION ?? '',
    endpoint: process.env.S3_ENDPOINT ?? '',
    bucket: process.env.S3_BUCKET ?? '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  };
}

let client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!client) {
    const config = getS3Config();
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return client;
}

export async function getSignedS3ObjectUrl(
  key: string,
  options: { expiresIn?: number } = {},
): Promise<string> {
  const config = getS3Config();
  const sanitizedKey = key.replace(/^\/+/, '');

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: sanitizedKey,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: options.expiresIn ?? 3600,
  });
}

export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const config = getS3Config();
    const parsed = new URL(url);
    const cleanPath = (value: string) => value.replace(/^\/+/, '');
    const decode = (value: string) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    if (config.endpoint) {
      const endpoint = new URL(config.endpoint);
      const endpointHost = endpoint.hostname;
      const virtualHost = `${config.bucket}.${endpointHost}`;

      if (parsed.hostname === endpointHost) {
        const path = cleanPath(parsed.pathname);
        if (path.startsWith(`${config.bucket}/`)) {
          return decode(path.slice(config.bucket.length + 1));
        }
        return decode(path);
      }

      if (parsed.hostname === virtualHost) {
        return decode(cleanPath(parsed.pathname));
      }
    }

    const awsVirtualHost = `${config.bucket}.s3.${config.region}.amazonaws.com`;
    if (parsed.hostname === awsVirtualHost) {
      return decode(cleanPath(parsed.pathname));
    }

    const genericPath = cleanPath(parsed.pathname);
    if (genericPath.startsWith(`${config.bucket}/`)) {
      return decode(genericPath.slice(config.bucket.length + 1));
    }

    return null;
  } catch {
    return null;
  }
}
