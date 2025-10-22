import { prisma } from '@muzo/db';
import type { Provider } from '@prisma/client';

export type FulfillmentJobPayload = {
  provider: 'printful' | 'printify' | 'cloudprinter';
  order: {
    orderId: string;
    files: Array<{
      url: string;
      type: 'default';
    }>;
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
  };
};

type OrderWithRelations = {
  id: string;
  provider: Provider;
  product: any;
  projectId: string;
  project: {
    outputs: Array<{
      url: string;
    }>;
  };
  user: {
    name: string | null;
    email: string;
  };
};

/**
 * Prepare fulfillment job payload from order data
 * This function fetches all necessary data and formats it for the fulfillment provider
 */
export async function prepareFulfillmentJobPayload(
  orderId: string
): Promise<FulfillmentJobPayload | null> {
  // Fetch order with all necessary relations
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      project: {
        include: {
          outputs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    console.error('[fulfillment-helper] Order not found:', orderId);
    return null;
  }

  // Get the latest output image
  const outputImage = order.project.outputs[0];
  if (!outputImage) {
    console.error('[fulfillment-helper] No output image found for order:', orderId);
    return null;
  }

  // Extract product info from JSON
  const productData = order.product as {
    variantId?: string;
    productId?: string;
    productOptions?: Record<string, string>;
    quantity?: number;
  };

  console.log('[fulfillment-helper] Product data from order:', JSON.stringify(productData, null, 2));

  const variantId = productData.variantId;
  if (!variantId) {
    console.error('[fulfillment-helper] No variant ID found in order product data:', orderId);
    return null;
  }

  const productId = productData.productId;
  const productOptions = productData.productOptions;
  console.log('[fulfillment-helper] Extracted productId:', productId);
  console.log('[fulfillment-helper] Extracted productOptions:', JSON.stringify(productOptions, null, 2));

  // Map Provider enum to fulfillment provider string
  const providerMap: Record<Provider, 'printful' | 'printify' | 'cloudprinter'> = {
    PRINTFUL: 'printful',
    PRINTIFY: 'printify',
    CLOUDPRINTER: 'cloudprinter',
  };

  const provider = providerMap[order.provider];
  if (!provider) {
    console.error('[fulfillment-helper] Unknown provider:', order.provider);
    return null;
  }

  // Default shipping address (France)
  // TODO: Get real shipping address from order/user profile
  const defaultShipping = {
    name: order.user.name || order.user.email.split('@')[0],
    address1: '19 Rue Beaurepaire',
    city: 'Paris',
    zip: '75010',
    country: 'FR',
  };

  // Build fulfillment payload
  const payload: FulfillmentJobPayload = {
    provider,
    order: {
      orderId: order.id,
      files: [
        {
          url: outputImage.url,
          type: 'default',
        },
      ],
      shipping: defaultShipping,
      items: [
        {
          productId,
          variantId,
          quantity: productData.quantity || 1,
          productOptions,
        },
      ],
    },
  };

  console.log('[fulfillment-helper] Prepared fulfillment payload for order:', orderId);
  console.log('[fulfillment-helper] Full payload:', JSON.stringify(payload, null, 2));
  return payload;
}
