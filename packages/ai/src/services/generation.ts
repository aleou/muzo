import OpenAI from 'openai';
import { z } from 'zod';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  };
  buffer?: Buffer;
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
    }),
  );

  return buildPublicS3Url(key, env);
}

async function generateImages(request: GenerationRequest, options: ImageOptions): Promise<StoredImage[]> {
  const client = getOpenAIClient();
  const prompt = buildPrompt(request);
  const { width, height } = parseSize(options.size);

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    quality: options.quality,
    size: options.size,
    background: options.background,
    output_format: options.format,
    moderation: options.moderation,
    n: options.n,
    partial_images: options.partialImages,
    input_fidelity: options.inputFidelity,
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
        metadata: image.metadata,
      };
    }),
  );
}

async function runPreviewGeneration(request: GenerationRequest): Promise<GenerationResponse> {
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

  const generated = await generateImages(request, options);
  const stored = await storeImages(request.projectId, 'preview', generated);

  return {
    projectId: request.projectId,
    outputs: stored,
  };
}

async function runFinalGeneration(request: GenerationRequest): Promise<GenerationResponse> {
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

  const generated = await generateImages(request, options);

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
            metadata: response.metadata,
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
          metadata: image.metadata,
        } satisfies StoredImage;
      } catch (error) {
        const url = await uploadToS3(image.buffer, baseKey, image.metadata.format);
        return {
          url,
          metadata: image.metadata,
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

      if (stage === 'final') {
        return runFinalGeneration(request);
      }

      return runPreviewGeneration(request);
    },
  };
}

