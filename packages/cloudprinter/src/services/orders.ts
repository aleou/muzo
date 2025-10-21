/**
 * ============================================================================
 * ORDERS SERVICE
 * ============================================================================
 * 
 * Manages CloudPrinter orders (list, info, create, cancel, logs)
 */

import type { CloudPrinterClient } from "../client";
import {
  OrdersListSchema,
  OrderDetailsSchema,
  CreateOrderResponseSchema,
  OrderLogSchema,
  type OrdersList,
  type OrderDetails,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type OrderLog,
} from "../types";

export class OrdersService {
  constructor(private client: CloudPrinterClient) {}

  /**
   * List all orders
   * 
   * @see https://www.cloudprinter.com/docs#list-all-orders
   */
  async list(): Promise<OrdersList> {
    const response = await this.client.post<unknown>("/orders/");
    
    // Handle both array and object responses
    if (Array.isArray(response)) {
      return OrdersListSchema.parse(response);
    }
    
    // If response is object with 'orders' property
    if (typeof response === 'object' && response !== null && 'orders' in response) {
      return OrdersListSchema.parse((response as any).orders);
    }
    
    return OrdersListSchema.parse(response);
  }

  /**
   * Get detailed information about a specific order
   * 
   * @see https://www.cloudprinter.com/docs#get-order-info
   */
  async get(reference: string): Promise<OrderDetails> {
    const response = await this.client.post<unknown>("/orders/info", {
      reference,
    });
    return OrderDetailsSchema.parse(response);
  }

  /**
   * Create a new order
   * 
   * @see https://www.cloudprinter.com/docs#add-order
   */
  async create(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response = await this.client.post<unknown>("/orders/add", request);
    return CreateOrderResponseSchema.parse(response);
  }

  /**
   * Cancel an order
   * 
   * @see https://www.cloudprinter.com/docs#cancel-order
   */
  async cancel(reference: string): Promise<void> {
    await this.client.post<void>("/orders/cancel", {
      reference,
    });
  }

  /**
   * Get order log (state changes history)
   * 
   * @see https://www.cloudprinter.com/docs#order-log
   */
  async getLog(reference: string): Promise<OrderLog> {
    const response = await this.client.post<unknown>("/orders/log", {
      reference,
    });
    return OrderLogSchema.parse(response);
  }
}
