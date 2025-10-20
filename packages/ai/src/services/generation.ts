import axios from 'axios';
import type { Readable } from 'node:stream';
import OpenAI, { toFile } from 'openai';
import { z } from 'zod';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GenerationRequest, GenerationResponse, generationRequestSchema } from '../types';
import { getRunpodUpscaleService } from './runpod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().optional().default(false),
});

type ServerEnv = z.infer<typeof envSchema>;

type ImageOptions = {
  stage: 'preview' | 'final';
  quality: 'low' | 'medium' | 'high' | 'auto';
  size: '1024x1024' | '1024x1536' | '1536x1024';
  background: 'auto' | 'opaque' | 'transparent';
  format: 'png' | 'jpeg' | 'webp';
  moderation: 'auto' | 'low';
  n: number;
  partialImages?: number;
  inputFidelity?: 'low' | 'high';
};

type StoredImage = {
  url: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    s3Key?: string;
  };
  buffer?: Buffer;
};

type ReferenceImage = {
  buffer: Buffer;
  mimeType: string;
};

let cachedEnv: ServerEnv | null = null;
let s3Client: S3Client | null = null;

function normalizeFormat(format: string): 'png' | 'jpeg' | 'webp' {
  const lowered = format.toLowerCase();

  if (lowered === 'jpeg' || lowered === 'jpg') {
    return 'jpeg';
  }

  if (lowered === 'webp') {
    return 'webp';
  }

  return 'png';
}


let openAIClient: OpenAI | null = null;

function getEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  });

  if (!parsed.success) {
    throw new Error('Invalid AI environment variables: ' + parsed.error.message);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const env = getEnv();
  s3Client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
}

function getOpenAIClient(): OpenAI {
  if (openAIClient) {
    return openAIClient;
  }

  const env = getEnv();
  openAIClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return openAIClient;
}

function buildPublicS3Url(key: string, env: ServerEnv): string {
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

function parseSize(size: string): { width: number; height: number } {
  const [widthStr, heightStr] = size.split('x');
  const width = Number.parseInt(widthStr, 10);
  const height = Number.parseInt(heightStr, 10);

  if (Number.isNaN(width) || Number.isNaN(height)) {
    return { width: 1024, height: 1024 };
  }

  return { width, height };
}

function buildPrompt(request: GenerationRequest): string {
  const segments: string[] = [];

  if (request.prompt.trim().length > 0) {
    segments.push(request.prompt.trim());
  }

  const stylePrompt = request.style?.preset?.prompt;
  if (typeof stylePrompt === 'string' && stylePrompt.trim().length > 0) {
    segments.push(stylePrompt.trim());
  }

  const negativePrompts: string[] = [];
  if (request.negativePrompt && request.negativePrompt.trim().length > 0) {
    negativePrompts.push(request.negativePrompt.trim());
  }

  const styleNegative = request.style?.preset?.negativePrompt;
  if (typeof styleNegative === 'string' && styleNegative.trim().length > 0) {
    negativePrompts.push(styleNegative.trim());
  }

  if (negativePrompts.length > 0) {
    segments.push(`Negative prompt: ${negativePrompts.join(', ')}`);
  }

  return segments.join('\n');
}

async function uploadToS3(buffer: Buffer, key: string, format: string): Promise<string> {
  const env = getEnv();
  const client = getS3Client();
  const normalizedFormat = normalizeFormat(format);
  const contentType = normalizedFormat === 'jpeg' ? 'image/jpeg' : `image/${normalizedFormat}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  );

  return buildPublicS3Url(key, env);
}

function resolveS3KeyFromUrl(url: string, env: ServerEnv): string | null {
  try {
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

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === 'function') {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof (body as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
    const arrayBuffer = await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const readable = body as Readable;
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readable.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    readable.once('end', () => resolve(Buffer.concat(chunks)));
    readable.once('error', (error) => reject(error));
  });
}

function guessMimeTypeFromKey(key: string): string {
  const extensionMatch = /\.([a-z0-9]{1,8})$/i.exec(key);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : null;

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'png':
    default:
      return 'image/png';
  }
}

function guessExtensionFromMime(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/png':
    default:
      return 'png';
  }
}

async function fetchReferenceImage(url: string): Promise<ReferenceImage | null> {
  const env = getEnv();
  const key = resolveS3KeyFromUrl(url, env);

  if (key) {
    try {
      const object = await getS3Client().send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
      );

      const buffer = await streamToBuffer(object.Body);
      const mimeType = object.ContentType ?? guessMimeTypeFromKey(key);

      if (buffer.length > 0) {
        return {
          buffer,
          mimeType,
        };
      }
    } catch (s3Error) {
      console.warn('[ai] Failed to fetch reference image from S3', {
        key,
        bucket: env.S3_BUCKET,
        error: s3Error,
      });
    }
  }

  try {
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    const rawMime = response.headers['content-type'];
    const mimeType = typeof rawMime === 'string' && rawMime.trim().length > 0 ? rawMime.split(';')[0].trim() : 'image/png';
    const buffer = Buffer.from(response.data);

    return {
      buffer,
      mimeType,
    };
  } catch (error) {
    let maskedUrl = url;

    try {
      const parsed = new URL(url);
      maskedUrl = `${parsed.origin}${parsed.pathname}`;
    } catch {
      // ignore masking failures
    }

    console.warn('[ai] Failed to fetch reference image for generation', { url: maskedUrl, error });
    return null;
  }
}

async function generateImages(
  request: GenerationRequest,
  options: ImageOptions,
  referenceImage?: ReferenceImage | null,
): Promise<StoredImage[]> {
  const client = getOpenAIClient();
  const prompt = buildPrompt(request);
  const { width, height } = parseSize(options.size);
  const useReference = !!referenceImage && referenceImage.buffer.length > 0;

  const response = useReference
    ? await client.images.edit({
        model: 'gpt-image-1',
        prompt,
        image: await toFile(referenceImage.buffer, `reference.${guessExtensionFromMime(referenceImage.mimeType)}`, {
          type: referenceImage.mimeType,
        }),
        background: options.background,
        input_fidelity: options.inputFidelity,
        output_format: options.format,
        quality: options.quality,
        size: options.size,
        n: options.n,
        partial_images: options.partialImages,
        user: request.projectId,
      })
    : await client.images.generate({
        model: 'gpt-image-1',
        prompt,
        quality: options.quality,
        size: options.size,
        background: options.background,
        output_format: options.format,
        moderation: options.moderation,
        n: options.n,
        partial_images: options.partialImages,
        user: request.projectId,
      });

  const images = response.data ?? [];
  return images.map((image, index) => {
    const b64 = image.b64_json;

    if (!b64) {
      throw new Error(`Missing image payload for index ${index}`);
    }

    const buffer = Buffer.from(b64, 'base64');

    return {
      buffer,
      url: '',
      metadata: {
        width,
        height,
        format: options.format,
      },
    } satisfies StoredImage;
  });
}

function buildStorageKey(projectId: string, stage: 'preview' | 'final', index: number, format: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const normalizedFormat = normalizeFormat(format);
  return `projects/${projectId}/${stage}/gpt-image-${timestamp}-${index}.${normalizedFormat}`;
}

async function storeImages(projectId: string, stage: 'preview' | 'final', images: StoredImage[]): Promise<StoredImage[]> {
  return Promise.all(
    images.map(async (image, index) => {
      if (!image.buffer) {
        throw new Error('Image buffer missing prior to storage');
      }

      const key = buildStorageKey(projectId, stage, index, image.metadata.format);
      const url = await uploadToS3(image.buffer, key, image.metadata.format);
      return {
        url,
        metadata: {
          ...image.metadata,
          s3Key: key,
        },
      };
    }),
  );
}

async function runPreviewGeneration(
  request: GenerationRequest,
  referenceImage?: ReferenceImage | null,
): Promise<GenerationResponse> {
  const options: ImageOptions = {
    stage: 'preview',
    quality: request.parameters?.quality ?? 'medium',
    size: request.parameters?.size && request.parameters.size !== 'auto' ? request.parameters.size : '1024x1024',
    background: request.parameters?.background ?? 'auto',
    format: request.parameters?.outputFormat ?? 'png',
    moderation: request.parameters?.moderation ?? 'auto',
    n: request.parameters?.n ?? 1,
    partialImages: request.parameters?.partialImages,
    inputFidelity: request.parameters?.inputFidelity,
  };

  const generated = await generateImages(request, options, referenceImage);
  const stored = await storeImages(request.projectId, 'preview', generated);

  return {
    projectId: request.projectId,
    outputs: stored,
  };
}

async function runFinalGeneration(
  request: GenerationRequest,
  referenceImage?: ReferenceImage | null,
): Promise<GenerationResponse> {
  const options: ImageOptions = {
    stage: 'final',
    quality: request.parameters?.quality ?? 'high',
    size: request.parameters?.size && request.parameters.size !== 'auto' ? request.parameters.size : '1024x1024',
    background: request.parameters?.background ?? 'auto',
    format: request.parameters?.outputFormat ?? 'png',
    moderation: request.parameters?.moderation ?? 'auto',
    n: request.parameters?.n ?? 1,
    partialImages: request.parameters?.partialImages,
    inputFidelity: request.parameters?.inputFidelity,
  };

  const generated = await generateImages(request, options, referenceImage);

  const shouldUpscale = request.parameters?.upscale ?? { target: '4k', provider: 'runpod' };
  const upscaleTarget = shouldUpscale.target ?? '4k';

  const runpodUpscale = shouldUpscale.provider === 'runpod' ? getRunpodUpscaleService() : null;

  const upscaled = await Promise.all(
    generated.map(async (image, index) => {
      const baseKey = buildStorageKey(request.projectId, 'final', index, image.metadata.format);

      if (!image.buffer) {
        throw new Error('Image buffer missing for upscale stage');
      }

      if (!runpodUpscale) {
        const url = await uploadToS3(image.buffer, baseKey, image.metadata.format);
        return {
          url,
          metadata: image.metadata,
        } satisfies StoredImage;
      }

      try {
        const response = await runpodUpscale.upscale({
          projectId: request.projectId,
          imageBase64: image.buffer.toString('base64'),
          target: upscaleTarget,
        });

        if (response.base64) {
          const buffer = Buffer.from(response.base64, 'base64');
          const url = await uploadToS3(buffer, baseKey, response.metadata.format);
          return {
            url,
            metadata: {
              ...response.metadata,
              s3Key: baseKey,
            },
          } satisfies StoredImage;
        }

        if (response.url) {
          return {
            url: response.url,
            metadata: response.metadata,
          } satisfies StoredImage;
        }

        // If response returns neither base64 nor url, fallback to original upload.
        const url = await uploadToS3(image.buffer, baseKey, image.metadata.format);
        return {
          url,
          metadata: {
            ...image.metadata,
            s3Key: baseKey,
          },
        } satisfies StoredImage;
      } catch (error) {
        const url = await uploadToS3(image.buffer, baseKey, image.metadata.format);
        return {
          url,
          metadata: {
            ...image.metadata,
            s3Key: baseKey,
          },
        } satisfies StoredImage;
      }
    }),
  );

  return {
    projectId: request.projectId,
    outputs: upscaled,
  };
}

export function getGenerationService() {
  return {
    async run(payload: unknown) {
      const request = generationRequestSchema.parse(payload);
      const stage = request.parameters?.stage ?? 'preview';
      const referenceImage = await fetchReferenceImage(request.inputImageUrl);

      if (stage === 'final') {
        return runFinalGeneration(request, referenceImage);
      }

      return runPreviewGeneration(request, referenceImage);
    },
  };
}
