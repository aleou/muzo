import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { buildPublicS3Url, getS3Client } from '@/lib/s3';
import { getServerEnv } from '@/lib/server-env';

const payloadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  checksum: z.string().optional(),
});

function createObjectKey(filename: string) {
  const extensionMatch = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : null;
  const uuid = randomUUID();
  const datePrefix = new Date().toISOString().slice(0, 10);
  return extension ? `uploads/${datePrefix}/${uuid}.${extension}` : `uploads/${datePrefix}/${uuid}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parseResult = payloadSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { filename, contentType, checksum } = parseResult.data;
  const key = createObjectKey(filename);
  const env = getServerEnv();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ...(checksum ? { ContentMD5: checksum } : {}),
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });

  return NextResponse.json({
    uploadUrl,
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    key,
    publicUrl: buildPublicS3Url(key),
    expiresIn: 60,
  });
}
