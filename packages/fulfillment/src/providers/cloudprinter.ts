import pino from 'pino';
import { CloudPrinter } from '@muzo/cloudprinter';
import type { FulfillmentOrder, FulfillmentProvider } from '../provider';
import { calculateMD5FromS3Url, getSignedS3Url } from '../utils/s3';

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

      // Get signed URLs and calculate MD5 checksums for all files
      logger.info({ orderId: order.orderId, fileCount: order.files.length }, 'Preparing files with signed URLs and MD5 checksums');
      const filesWithMD5 = await Promise.all(
        order.files.map(async (file) => {
          // Get a long-lived signed URL (24 hours) so CloudPrinter can download the file
          const signedUrl = await getSignedS3Url(file.url, { expiresIn: 86400 }); // 24 hours
          const md5sum = await calculateMD5FromS3Url(file.url);
          logger.info({ originalUrl: file.url, signedUrl, md5sum }, 'File prepared with signed URL and MD5');
          return {
            type: 'product' as const,
            url: signedUrl, // Use signed URL instead of public URL
            md5sum,
          };
        })
      );

      // Map items to CloudPrinter format (very specific schema)
      // Each item needs the base product ID + the option references
      const items = order.items.map((item, index) => {
        // Use productId if available, otherwise try to extract from variantId (legacy)
        const productId = item.productId || (
          item.variantId.includes('|') 
            ? item.variantId.split('|')[0].split(':')[1] || item.variantId
            : item.variantId
        );
        
        logger.info({ 
          itemIndex: index,
          productId,
          variantId: item.variantId,
          productOptions: item.productOptions 
        }, 'Mapping item to CloudPrinter format');
        
        // Build options array from productOptions if available
        const optionsArray = item.productOptions
          ? Object.values(item.productOptions).map((optionRef: any) => ({
              type: optionRef as string,
              count: String(item.quantity),
            }))
          : [];

        logger.info({ 
          itemIndex: index,
          productId,
          optionsCount: optionsArray.length,
          options: optionsArray 
        }, 'Built options array for CloudPrinter');

        return {
          reference: `${order.orderId}-item-${index + 1}`, // Unique reference for this item
          product: productId, // CloudPrinter product reference
          shipping_level: 'cp_ground', // Required! Ground shipping (3-10 days)
          title: 'Photo MUZO', // Item title
          count: String(item.quantity), // Must be string!
          options: optionsArray,
          files: [
            // Map all files with their types
            ...filesWithMD5.map(f => ({ ...f })),
          ],
        };
      });

      // Create order with CloudPrinter API
      const orderPayload = {
        reference: order.orderId, // Use our internal order ID as reference
        email: 'orders@muzo.app', // Support email for CloudPrinter
        items,
        addresses: [
          {
            type: 'delivery' as const, // Required: 'delivery' or 'billing'
            firstname,
            lastname,
            street1: order.shipping.address1,
            city: order.shipping.city,
            zip: order.shipping.zip,
            country: order.shipping.country,
            phone: '+33123456789', // TODO: Get real phone number from order
            email: 'customer@muzo.app', // TODO: Get real customer email from order
          },
        ],
      };

      // Log complete payload for debugging (without sensitive data)
      logger.info(
        { 
          reference: orderPayload.reference,
          itemCount: orderPayload.items.length,
          address: orderPayload.addresses[0],
        }, 
        'Sending order to CloudPrinter'
      );

      const response = await client.orders.create(orderPayload);

      const providerOrderId = response.order; // Response has 'order' field with the reference
      logger.info({ providerOrderId, orderId: order.orderId }, 'CloudPrinter order created successfully');
      
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
