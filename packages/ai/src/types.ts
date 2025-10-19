import { z } from 'zod';

const generationParametersSchema = z
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

// TODO(ai): Extend request schema with guidance prompts, style hints, and free-tier generation tokens.
export const generationRequestSchema = z.object({
  projectId: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  style: z.object({
    id: z.string(),
    preset: z.record(z.string(), z.unknown()).optional(),
  }),
  inputImageUrl: z.string().url(),
  parameters: generationParametersSchema.optional(),
});

// TODO(ai): Capture IA output provenance + mockup asset references for studio previews.
export const generationResponseSchema = z.object({
  projectId: z.string(),
  outputs: z.array(
    z.object({
      url: z.string().url(),
      metadata: z.object({
        width: z.number().int(),
        height: z.number().int(),
        format: z.string(),
      }),
    }),
  ),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GenerationParameters = z.infer<typeof generationParametersSchema>;
export type GenerationResponse = z.infer<typeof generationResponseSchema>;
