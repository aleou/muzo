import { z } from 'zod';
import { mockupJobSchema } from '../schemas';

export type MockupJob = z.infer<typeof mockupJobSchema>;

export function validateMockupJob(payload: unknown): MockupJob {
  return mockupJobSchema.parse(payload);
}
