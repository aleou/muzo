/**
 * ============================================================================
 * CLOUDPRINTER SDK
 * ============================================================================
 * 
 * Official CloudPrinter API client for Node.js
 * 
 * @see https://www.cloudprinter.com/docs
 */

export * from "./types";
export * from "./client";

import { CloudPrinterClient } from "./client";
import { OrdersService } from "./services/orders";
import { QuotesService } from "./services/quotes";
import { ProductsService } from "./services/products";
import { ShippingService } from "./services/shipping";

/**
 * CloudPrinter API Client
 * 
 * Main entry point for interacting with CloudPrinter API
 * 
 * @example
 * ```typescript
 * import { CloudPrinter } from '@muzo/cloudprinter';
 * 
 * const cloudprinter = new CloudPrinter({
 *   apiKey: process.env.CLOUDPRINTER_API_KEY,
 * });
 * 
 * // List products
 * const products = await cloudprinter.products.list();
 * 
 * // Get a quote
 * const quote = await cloudprinter.quotes.getEUR('GB', [{
 *   product: 'product-reference',
 *   count: 100,
 * }]);
 * 
 * // Create an order
 * const order = await cloudprinter.orders.create({
 *   reference: 'my-order-123',
 *   email: 'customer@example.com',
 *   items: [...],
 *   address: {...},
 * });
 * ```
 */
export class CloudPrinter extends CloudPrinterClient {
  public readonly orders: OrdersService;
  public readonly quotes: QuotesService;
  public readonly products: ProductsService;
  public readonly shipping: ShippingService;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    super(config);

    // Initialize services
    this.orders = new OrdersService(this);
    this.quotes = new QuotesService(this);
    this.products = new ProductsService(this);
    this.shipping = new ShippingService(this);
  }
}

export default CloudPrinter;
