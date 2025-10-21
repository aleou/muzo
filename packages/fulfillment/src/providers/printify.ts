import axios from 'axios';
import pino from 'pino';
import type { FulfillmentOrder, FulfillmentProvider } from '../provider';

export function createPrintifyProvider(): FulfillmentProvider {
  const apiKey = process.env.PRINTIFY_API_KEY;
  const logger = pino({ name: 'muzo-printify' });

  if (!apiKey) {
    throw new Error('PRINTIFY_API_KEY is not defined');
  }

  const client = axios.create({
    baseURL: 'https://api.printify.com/v1',
    headers: {
      Authorization: 'Bearer ' + apiKey,
    },
  });

  return {
    id: 'printify',
    async createOrder(order: FulfillmentOrder) {
      const response = await client.post('/shops/your-shop-id/orders.json', {
        recipient: order.shipping,
        items: order.items.map((item) => ({
          product_id: item.variantId,
          quantity: item.quantity,
          print_areas: [
            {
              variant_id: item.variantId,
              files: order.files,
            },
          ],
        })),
      });

      const providerOrderId = String(response.data.id ?? '');
      logger.info({ providerOrderId }, 'Printify order created');
      return { providerOrderId };
    },
    async getOrderStatus(providerOrderId: string) {
      const response = await client.get('/shops/your-shop-id/orders/' + providerOrderId + '.json');
      return {
        status: response.data.status as string,
        tracking: response.data.shipments?.[0]?.tracking_number as string | undefined,
      };
    },
    async listProducts() {
      const response = await client.get('/catalog/blueprints.json');
      return (response.data ?? []).map((product: { id: number; title: string }) => ({
        id: String(product.id),
        name: product.title,
      }));
    },
    async listVariants(productId: string) {
      const response = await client.get('/catalog/blueprints/' + productId + '.json');
      return (response.data?.variants ?? []).map(
        (variant: { id: number; title: string; min_dpi: number }) => ({
          id: String(variant.id),
          size: variant.title,
          dpiRequirement: variant.min_dpi ?? 300,
        }),
      );
    },
    async getQuote(productId: string, variantId: string, quantity = 1) {
      try {
        // Printify doesn't have a direct quote API, we'll use shipping calculator
        const response = await client.post('/shops/your-shop-id/orders/shipping.json', {
          line_items: [
            {
              product_id: productId,
              variant_id: Number(variantId),
              quantity,
            },
          ],
          address_to: {
            address1: '19 Rue Beaurepaire',
            city: 'Paris',
            zip: '75010',
            country: 'FR',
          },
        });

        const profile = response.data.shipping_profiles?.[0];
        const productPrice = profile?.costs?.subtotal ?? 0;
        const shippingPrice = profile?.costs?.shipping ?? 0;
        
        return {
          variantId,
          currency: 'USD', // Printify typically uses USD
          price: productPrice,
          shipping: shippingPrice,
          total: productPrice + shippingPrice,
        };
      } catch (error) {
        logger.warn({ error, productId, variantId }, 'Printify quote failed, using fallback pricing');
        
        // Fallback pricing based on typical Printify rates
        const fallbackPrice = productId === '62' ? 24.95 : 16.95; // Puzzle vs Poster
        const fallbackShipping = 3.95;
        
        return {
          variantId,
          currency: 'USD',
          price: fallbackPrice * quantity,
          shipping: fallbackShipping,
          total: fallbackPrice * quantity + fallbackShipping,
        };
      }
    },
  };
}
