import pino from 'pino';
import { CloudPrinter } from '@muzo/cloudprinter';
import type { FulfillmentOrder, FulfillmentProvider } from '../provider';
import { calculateMD5FromS3Url } from '../utils/s3';

export function createCloudPrinterProvider(): FulfillmentProvider {
  const apiKey = process.env.CLOUDPRINTER_API_KEY;
  const logger = pino({ name: 'muzo-cloudprinter' });

  if (!apiKey) {
    throw new Error('CLOUDPRINTER_API_KEY is not defined');
  }

  const client = new CloudPrinter({ apiKey });

  return {
    id: 'cloudprinter',
    
    async createOrder(order: FulfillmentOrder) {
      logger.info({ orderId: order.orderId }, 'Creating CloudPrinter order');

      // Split name into firstname/lastname
      const nameParts = order.shipping.name.split(' ');
      const firstname = nameParts[0] || 'Customer';
      const lastname = nameParts.slice(1).join(' ') || 'MUZO';

      // Calculate MD5 checksums for all files from S3
      logger.info({ orderId: order.orderId, fileCount: order.files.length }, 'Calculating MD5 checksums from S3');
      const filesWithMD5 = await Promise.all(
        order.files.map(async (file) => {
          const md5sum = await calculateMD5FromS3Url(file.url);
          logger.info({ url: file.url, md5sum }, 'MD5 calculated');
          return {
            type: 'product' as const,
            url: file.url,
            md5sum,
          };
        })
      );

      // Map items to CloudPrinter format (very specific schema)
      // Puzzle products require BOTH 'product' and 'box' files
      const items = order.items.map((item, index) => ({
        reference: `item-${index + 1}`, // Unique reference for this item
        product: item.variantId, // CloudPrinter product reference
        shipping_level: 'cp_ground', // Required! Ground shipping (3-10 days)
        title: 'Puzzle Photo MUZO', // Item title
        count: String(item.quantity), // Must be string!
        options: [
          { type: 'puzzle_box_printed_373x273x56_mm', count: String(item.quantity) },
          { type: 'puzzle_cardboard', count: String(item.quantity) },
        ],
        files: [
          // Same image for both product and box
          ...filesWithMD5.map(f => ({ ...f, type: 'product' as const })),
          ...filesWithMD5.map(f => ({ ...f, type: 'box' as const })),
        ],
      }));

      // Create order with CloudPrinter API
      const orderPayload = {
        reference: order.orderId, // Use our internal order ID as reference
        email: 'orders@muzo.app', // TODO: Use real customer email
        items,
        addresses: [
          {
            type: 'delivery', // Required: 'delivery' or 'billing'
            firstname,
            lastname,
            street1: order.shipping.address1,
            city: order.shipping.city,
            zip: order.shipping.zip,
            country: order.shipping.country,
            phone: '+33123456789', // TODO: Get real phone number
            email: 'customer@muzo.app', // TODO: Get real customer email
          },
        ],
      };

      // Log complete payload for debugging
      logger.info({ orderPayload: JSON.stringify(orderPayload) }, 'Sending order to CloudPrinter');

      const response = await client.orders.create(orderPayload);

      const providerOrderId = response.order; // Response has 'order' field, not 'reference'
      logger.info({ providerOrderId, orderId: order.orderId }, 'CloudPrinter order created');
      
      return { providerOrderId };
    },

    async getOrderStatus(providerOrderId: string) {
      const orderDetails = await client.orders.get(providerOrderId);
      
      // CloudPrinter uses 'state' not 'status'
      // tracking is in items, not at order level
      const firstItemTracking = orderDetails.items[0]?.tracking;
      
      return {
        status: orderDetails.state,
        tracking: firstItemTracking,
      };
    },

    async listProducts() {
      const products = await client.products.list();
      
      return products.map((product) => ({
        id: product.reference,
        name: product.name, // CloudPrinter uses 'name' not 'title'
      }));
    },

    async listVariants(productId: string) {
      const product = await client.products.get(productId);
      
      // CloudPrinter products don't have variants in the same way
      // Return the product itself as a single variant
      return [
        {
          id: product.reference,
          size: product.name, // CloudPrinter uses 'name' not 'title'
          dpiRequirement: 300, // Default DPI requirement
        },
      ];
    },

    async getQuote(productId: string, variantId: string, quantity = 1) {
      try {
        // Get quote for France (FR)
        const quote = await client.quotes.getEUR('FR', [
          {
            reference: 'quote-item-1',
            product: variantId,
            count: String(quantity), // Must be string!
            options: [],
          },
        ]);

        // CloudPrinter returns price as string, parse it
        const totalPrice = parseFloat(quote.price) + parseFloat(quote.vat);
        
        // Get shipping price from first shipment's first quote
        const shippingPrice = quote.shipments[0]?.quotes[0]
          ? parseFloat(quote.shipments[0].quotes[0].price)
          : 0;
        
        const productPrice = totalPrice - shippingPrice;

        return {
          variantId,
          currency: quote.currency,
          price: productPrice,
          shipping: shippingPrice,
          total: totalPrice,
        };
      } catch (error) {
        logger.error({ error, variantId, quantity }, 'Failed to get CloudPrinter quote, using fallback');
        
        // Fallback pricing
        return {
          variantId,
          currency: 'EUR',
          price: 19.95,
          shipping: 3.95,
          total: 23.90,
        };
      }
    },
  };
}
