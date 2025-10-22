import { z } from 'zod';

export const providerIdSchema = z.enum(['printful', 'printify', 'cloudprinter']);
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
  items: Array<{ 
    productId?: string;
    variantId: string; 
    quantity: number;
    productOptions?: Record<string, string>;
  }>;
}

export interface ProductPrice {
  variantId: string;
  currency: string;
  price: number;
  shipping: number;
  total: number;
}

export interface FulfillmentProvider {
  id: ProviderId;
  createOrder(order: FulfillmentOrder): Promise<{ providerOrderId: string }>;
  getOrderStatus(providerOrderId: string): Promise<{ status: string; tracking?: string } | null>;
  listProducts(): Promise<Array<{ id: string; name: string }>>;
  listVariants(productId: string): Promise<Array<{ id: string; size: string; dpiRequirement: number }>>;
  getQuote(productId: string, variantId: string, quantity?: number): Promise<ProductPrice>;
}

export type ProviderFactory = (env?: Record<string, string | undefined>) => FulfillmentProvider;

// TODO(fulfillment): Introduce routing by SKU/country and surface SLA/variant metadata when resolving providers.
export async function getFulfillmentProvider(provider: ProviderId) {
  // Only CloudPrinter is active for now
  // Printful and Printify are disabled until properly configured
  
  if (provider === 'printful') {
    throw new Error('Printful provider is disabled. Use CloudPrinter instead.');
  }

  if (provider === 'printify') {
    throw new Error('Printify provider is disabled. Use CloudPrinter instead.');
  }

  if (provider === 'cloudprinter') {
    const { createCloudPrinterProvider } = await import('./providers/cloudprinter');
    return createCloudPrinterProvider();
  }

  throw new Error('Unknown fulfillment provider: ' + provider);
}
