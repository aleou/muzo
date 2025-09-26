import axios from 'axios';
import { generationRequestSchema, generationResponseSchema } from '../types.js';

export function getGenerationService() {
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!apiKey) {
    throw new Error('RUNPOD_API_KEY is not defined');
  }

  const client = axios.create({
    baseURL: 'https://api.runpod.ai/v2',
    headers: {
      Authorization: 'Bearer ' + apiKey,
    },
  });

  return {
    async run(payload: unknown) {
      const request = generationRequestSchema.parse(payload);
      const response = await client.post('/muzo-generate/run', request);
      const data = generationResponseSchema.parse(response.data);
      return data;
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
