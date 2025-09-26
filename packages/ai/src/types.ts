import { z } from 'zod';

export const generationRequestSchema = z.object({
  projectId: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  style: z.object({
    id: z.string(),
    preset: z.record(z.string(), z.unknown()).optional(),
  }),
  inputImageUrl: z.string().url(),
});

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
export type GenerationResponse = z.infer<typeof generationResponseSchema>;
