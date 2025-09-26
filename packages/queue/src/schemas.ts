import { z } from 'zod';

enum JobType {
  GENERATION = 'generation',
  MOCKUP = 'mockup',
  FULFILLMENT = 'fulfillment',
}

export const generationJobSchema = z.object({
  projectId: z.string(),
  styleId: z.string(),
  promptText: z.string(),
  inputAssetId: z.string(),
  negativePrompt: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export const mockupJobSchema = z.object({
  orderId: z.string(),
  outputAssetId: z.string(),
  productVariantId: z.string(),
  template: z.string().optional(),
});

export const fulfillmentJobSchema = z.object({
  provider: z.enum(['printful', 'printify']),
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
