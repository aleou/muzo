import { JobType } from '@muzo/db';
import { validateGenerationJob, type GenerationJob } from './jobs/generation';
import { validateMockupJob, type MockupJob } from './jobs/mockup';
import { validateFulfillmentJob, type FulfillmentJob } from './jobs/fulfillment';

export type JobPayloadByType = {
  [JobType.GENERATION]: GenerationJob;
  [JobType.MOCKUP]: MockupJob;
  [JobType.FULFILLMENT]: FulfillmentJob;
};

export type QueueJobPayload<T extends JobType> = JobPayloadByType[T];

export interface QueueJob<T extends JobType> {
  id: string;
  type: T;
  data: QueueJobPayload<T>;
  attempts: number;
  maxAttempts: number;
  projectId?: string | null;
}

const validators = {
  [JobType.GENERATION]: validateGenerationJob,
  [JobType.MOCKUP]: validateMockupJob,
  [JobType.FULFILLMENT]: validateFulfillmentJob,
} as const;

export type PayloadValidatorMap = typeof validators;

export const JOB_PAYLOAD_VALIDATORS: PayloadValidatorMap = validators;
