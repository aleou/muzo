import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'muzo-s3-utils' });

let s3Client: S3Client | null = null;

/**
 * Get or create S3 client with credentials from environment
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.S3_REGION;
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 credentials not configured. Set S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY');
    }

    s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Extract S3 key from URL
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error('S3_BUCKET not configured');
    }

    const parsed = new URL(url);
    const cleanPath = (value: string) => value.replace(/^\/+/, '');

    // Handle custom endpoint (e.g., MinIO, Cloudflare R2)
    if (process.env.S3_ENDPOINT) {
      const endpoint = new URL(process.env.S3_ENDPOINT);
      const endpointHost = endpoint.hostname;
      const virtualHost = `${bucket}.${endpointHost}`;

      // Path-style: https://endpoint.com/bucket/key
      if (parsed.hostname === endpointHost) {
        const path = cleanPath(parsed.pathname);
        if (path.startsWith(`${bucket}/`)) {
          return path.slice(bucket.length + 1);
        }
        return path;
      }

      // Virtual-hosted-style: https://bucket.endpoint.com/key
      if (parsed.hostname === virtualHost) {
        return cleanPath(parsed.pathname);
      }
    }

    // AWS S3 virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
    const region = process.env.S3_REGION || 'us-east-1';
    const awsVirtualHost = `${bucket}.s3.${region}.amazonaws.com`;
    if (parsed.hostname === awsVirtualHost) {
      return cleanPath(parsed.pathname);
    }

    // Fallback: try to extract from path
    const genericPath = cleanPath(parsed.pathname);
    if (genericPath.startsWith(`${bucket}/`)) {
      return genericPath.slice(bucket.length + 1);
    }

    return null;
  } catch (error) {
    logger.error({ error, url }, 'Failed to extract S3 key from URL');
    return null;
  }
}

/**
 * Download file from S3 and calculate MD5 checksum
 */
export async function calculateMD5FromS3Url(url: string): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET not configured');
  }

  // Extract S3 key from URL
  const key = extractS3KeyFromUrl(url);
  if (!key) {
    throw new Error(`Failed to extract S3 key from URL: ${url}`);
  }

  logger.info({ url, bucket, key }, 'Downloading file from S3 for MD5 calculation');

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);

    if (!response.Body) {
      throw new Error('S3 response has no body');
    }

    // Calculate MD5 from stream
    const hash = crypto.createHash('md5');
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    
    hash.update(buffer);
    const md5sum = hash.digest('hex');

    logger.info({ url, key, md5sum, size: buffer.length }, 'MD5 calculated successfully');
    return md5sum;
  } catch (error) {
    logger.error({ error, url, bucket, key }, 'Failed to calculate MD5 from S3');
    throw new Error(`Failed to download and calculate MD5 for ${url}: ${error}`);
  }
}
