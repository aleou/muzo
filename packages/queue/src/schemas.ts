import { z } from 'zod';

enum JobType {
  GENERATION = 'generation',
  MOCKUP = 'mockup',
  FULFILLMENT = 'fulfillment',
}

const generationJobParametersSchema = z
  .object({
    stage: z.enum(['preview', 'final']).optional(),
    quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
    size: z.enum(['1024x1024', '1024x1536', '1536x1024', 'auto']).optional(),
    outputFormat: z.enum(['png', 'jpeg', 'webp']).optional(),
    background: z.enum(['auto', 'opaque', 'transparent']).optional(),
    moderation: z.enum(['auto', 'low']).optional(),
    n: z.number().int().min(1).max(4).optional(),
    partialImages: z.number().int().min(0).max(3).optional(),
    inputFidelity: z.enum(['low', 'high']).optional(),
    upscale: z
      .object({
        target: z.enum(['4k', '8k']).optional(),
        provider: z.enum(['runpod']).optional(),
      })
      .optional(),
  })
  .strict()
  .partial();

// TODO(queue): Enrich payload with idempotency keys and domain event references once the outbox is in place.
export const generationJobSchema = z.object({
  projectId: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  style: z.object({
    id: z.string(),
    preset: z.record(z.string(), z.unknown()).optional(),
  }),
  inputImageUrl: z.string().url(),
  parameters: generationJobParametersSchema.optional(),
});

// TODO(queue): Include product/variant provenance + preview asset refs for mockup rendering.
export const mockupJobSchema = z.object({
  orderId: z.string(),
  outputAssetId: z.string(),
  productVariantId: z.string(),
  template: z.string().optional(),
});

// TODO(queue): Attach provider routing hints and retry metadata (backoff, maxAttempts) for fulfillment jobs.
export const fulfillmentJobSchema = z.object({
  provider: z.enum(['printful', 'printify', 'cloudprinter']),
  order: z.object({
    orderId: z.string(),
    files: z.array(
      z.object({
        url: z.string().url(),
        type: z.literal('default'),
      }),
    ),
    shipping: z.object({
      name: z.string(),
      address1: z.string(),
      city: z.string(),
      zip: z.string(),
      country: z.string(),
    }),
    items: z.array(
      z.object({
        variantId: z.string(),
        quantity: z.number().int().positive(),
      }),
    ),
  }),
});

export type JobTypeValue = keyof typeof JobType;
