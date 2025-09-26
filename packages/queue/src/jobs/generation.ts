import { z } from 'zod';
import { generationJobSchema } from '../schemas.js';

export type GenerationJob = z.infer<typeof generationJobSchema>;

export function validateGenerationJob(payload: unknown): GenerationJob {
  return generationJobSchema.parse(payload);
}
