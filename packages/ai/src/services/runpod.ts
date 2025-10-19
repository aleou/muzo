import axios from 'axios';
import { z } from 'zod';
import { generationRequestSchema, generationResponseSchema } from '../types';

const upscaleRequestSchema = z.object({
  projectId: z.string(),
  imageBase64: z.string().min(1),
  target: z.enum(['4k', '8k']).default('4k'),
});

const upscaleResponseSchema = z.object({
  url: z.string().url().optional(),
  base64: z.string().optional(),
  metadata: z.object({
    width: z.number().int(),
    height: z.number().int(),
    format: z.string(),
  }),
});

type UpscaleRequest = z.infer<typeof upscaleRequestSchema>;
type UpscaleResponse = z.infer<typeof upscaleResponseSchema>;

function createClient() {
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!apiKey) {
    throw new Error('RUNPOD_API_KEY is not defined');
  }

  return axios.create({
    baseURL: process.env.RUNPOD_API_BASE_URL ?? 'https://api.runpod.ai/v2',
    headers: {
      Authorization: 'Bearer ' + apiKey,
    },
  });
}

export function getRunpodGenerationService() {
  const client = createClient();
  const endpoint = process.env.RUNPOD_GENERATE_ENDPOINT ?? '/muzo-generate/run';

  return {
    async run(payload: unknown) {
      const request = generationRequestSchema.parse(payload);
      const response = await client.post(endpoint, request);
      const data = generationResponseSchema.parse(response.data);
      return data;
    },
  };
}

export function getRunpodUpscaleService() {
  const client = createClient();
  const endpoint = process.env.RUNPOD_UPSCALE_ENDPOINT ?? '/muzo-upscale/run';

  return {
    async upscale(payload: UpscaleRequest): Promise<UpscaleResponse> {
      const request = upscaleRequestSchema.parse(payload);
      const response = await client.post(endpoint, request);
      return upscaleResponseSchema.parse(response.data);
    },
  };
}

export function getMockupService() {
  return {
    async run(payload: unknown) {
      return payload;
    },
  };
}
