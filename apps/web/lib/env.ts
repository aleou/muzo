import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'Stripe publishable key is required'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

export type WebEnv = z.infer<typeof schema>;

export function getWebEnv(): WebEnv {
  const parsed = schema.safeParse({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  if (!parsed.success) {
    throw new Error('Invalid web environment variables: ' + parsed.error.message);
  }

  return parsed.data;
}
