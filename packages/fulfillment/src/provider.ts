import { z } from 'zod';

export const providerIdSchema = z.enum(['printful', 'printify']);
export type ProviderId = z.infer<typeof providerIdSchema>;

export interface FulfillmentOrder {
  orderId: string;
  provider: ProviderId;
  files: Array<{ url: string; type: 'default' }>;
  shipping: {
    name: string;
    address1: string;
    city: string;
    zip: string;
    country: string;
  };
  items: Array<{ variantId: string; quantity: number }>;
}

export interface FulfillmentProvider {
  id: ProviderId;
  createOrder(order: FulfillmentOrder): Promise<{ providerOrderId: string }>;
  getOrderStatus(providerOrderId: string): Promise<{ status: string; tracking?: string } | null>;
  listProducts(): Promise<Array<{ id: string; name: string }>>;
  listVariants(productId: string): Promise<Array<{ id: string; size: string; dpiRequirement: number }>>;
}

export type ProviderFactory = (env?: Record<string, string | undefined>) => FulfillmentProvider;

// TODO(fulfillment): Introduce routing by SKU/country and surface SLA/variant metadata when resolving providers.
export async function getFulfillmentProvider(provider: ProviderId) {
  const { createPrintfulProvider } = await import('./providers/printful');
  const { createPrintifyProvider } = await import('./providers/printify');

  if (provider === 'printful') {
    return createPrintfulProvider();
  }

  if (provider === 'printify') {
    return createPrintifyProvider();
  }

  throw new Error('Unknown fulfillment provider: ' + provider);
}
