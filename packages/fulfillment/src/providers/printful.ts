import axios from 'axios';
import pino from 'pino';
import type { FulfillmentOrder, FulfillmentProvider } from '../provider.js';

export function createPrintfulProvider(): FulfillmentProvider {
  const apiKey = process.env.PRINTFUL_API_KEY;
  const logger = pino({ name: 'muzo-printful' });

  if (!apiKey) {
    throw new Error('PRINTFUL_API_KEY is not defined');
  }

  const client = axios.create({
    baseURL: 'https://api.printful.com',
    headers: {
      Authorization: 'Bearer ' + apiKey,
    },
  });

  return {
    id: 'printful',
    async createOrder(order: FulfillmentOrder) {
      const response = await client.post('/orders', {
        recipient: order.shipping,
        items: order.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          files: order.files,
        })),
      });

      const providerOrderId = response.data.result?.id as string;
      logger.info({ providerOrderId }, 'Printful order created');
      return { providerOrderId };
    },
    async getOrderStatus(providerOrderId: string) {
      const response = await client.get('/orders/' + providerOrderId);
      return {
        status: response.data.result?.status as string,
        tracking: response.data.result?.shipping?.tracking_number as string | undefined,
      };
    },
    async listProducts() {
      const response = await client.get('/products');
      return (response.data.result ?? []).map((product: { id: number; title: string }) => ({
        id: String(product.id),
        name: product.title,
      }));
    },
    async listVariants(productId: string) {
      const response = await client.get('/products/' + productId);
      return (response.data.result?.variants ?? []).map(
        (variant: { id: number; size: string; files: Array<{ type: string; dpi: number }> }) => ({
          id: String(variant.id),
          size: variant.size,
          dpiRequirement: variant.files?.find((file) => file.type === 'preview')?.dpi ?? 300,
        }),
      );
    },
  };
}
