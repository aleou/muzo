import { z } from 'zod';
import { fulfillmentJobSchema } from '../schemas.js';

export type FulfillmentJob = z.infer<typeof fulfillmentJobSchema>;

export function validateFulfillmentJob(payload: unknown): FulfillmentJob {
  return fulfillmentJobSchema.parse(payload);
}
