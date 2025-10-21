/**
 * ============================================================================
 * QUOTES SERVICE
 * ============================================================================
 * 
 * Manages price quotes and shipping calculations
 */

import type { CloudPrinterClient } from "../client";
import {
  QuoteResponseSchema,
  type QuoteRequest,
  type QuoteResponse,
} from "../types";

export class QuotesService {
  constructor(private client: CloudPrinterClient) {}

  /**
   * Get a price quote for items including shipping options
   * 
   * @see https://www.cloudprinter.com/docs#order-quote
   */
  async get(request: QuoteRequest): Promise<QuoteResponse> {
    const response = await this.client.post<unknown>("/orders/quote", request);
    return QuoteResponseSchema.parse(response);
  }

  /**
   * Get quote with default EUR currency
   */
  async getEUR(
    country: string,
    items: QuoteRequest["items"],
    state?: string,
  ): Promise<QuoteResponse> {
    return this.get({
      country,
      state,
      currency: "EUR",
      items,
    });
  }

  /**
   * Get quote with USD currency
   */
  async getUSD(
    country: string,
    items: QuoteRequest["items"],
    state?: string,
  ): Promise<QuoteResponse> {
    return this.get({
      country,
      state,
      currency: "USD",
      items,
    });
  }
}
