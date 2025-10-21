/**
 * ============================================================================
 * SHOPS SERVICE
 * ============================================================================
 * 
 * Manages Printify shops
 */

import type { PrintifyClient } from "../client";
import { ShopsResponseSchema, type Shop } from "../types";

export class ShopsService {
  constructor(private client: PrintifyClient) {}

  /**
   * Retrieve a list of shops in a Printify account
   * 
   * @see https://developers.printify.com/#retrieve-list-of-shops-in-a-printify-account
   */
  async list(): Promise<Shop[]> {
    const response = await this.client.get<unknown>("/shops.json");
    return ShopsResponseSchema.parse(response);
  }

  /**
   * Disconnect a shop from a Printify account
   * 
   * @see https://developers.printify.com/#disconnect-a-shop
   */
  async disconnect(shopId: number): Promise<void> {
    await this.client.delete<void>(`/shops/${shopId}/connection.json`);
  }
}
