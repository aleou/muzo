/**
 * ============================================================================
 * CATALOG SERVICE
 * ============================================================================
 * 
 * Manages Printify catalog (blueprints, print providers, variants, shipping)
 * Note: All catalog endpoints have a special rate limit of 100 requests/minute
 */

import type { PrintifyClient } from "../client";
import {
  BlueprintsResponseSchema,
  BlueprintSchema,
  PrintProvidersResponseSchema,
  PrintProviderSchema,
  VariantsResponseSchema,
  ShippingResponseSchema,
  type Blueprint,
  type PrintProvider,
  type Variant,
  type ShippingResponse,
  type GetVariantsOptions,
} from "../types";

export class CatalogService {
  constructor(private client: PrintifyClient) {}

  /**
   * ============================================================================
   * BLUEPRINTS
   * ============================================================================
   */

  /**
   * Retrieve a list of all available blueprints
   * 
   * @see https://developers.printify.com/#retrieve-a-list-of-available-blueprints
   */
  async getBlueprints(): Promise<Blueprint[]> {
    const response = await this.client.get<unknown>("/catalog/blueprints.json", {
      isCatalogEndpoint: true,
    });
    return BlueprintsResponseSchema.parse(response);
  }

  /**
   * Retrieve a specific blueprint by ID
   * 
   * @see https://developers.printify.com/#retrieve-a-specific-blueprint
   */
  async getBlueprint(blueprintId: number): Promise<Blueprint> {
    const response = await this.client.get<unknown>(
      `/catalog/blueprints/${blueprintId}.json`,
      { isCatalogEndpoint: true },
    );
    return BlueprintSchema.parse(response);
  }

  /**
   * ============================================================================
   * PRINT PROVIDERS
   * ============================================================================
   */

  /**
   * Retrieve a list of all available print providers
   * 
   * @see https://developers.printify.com/#retrieve-a-list-of-available-print-providers
   */
  async getPrintProviders(): Promise<PrintProvider[]> {
    const response = await this.client.get<unknown>("/catalog/print_providers.json", {
      isCatalogEndpoint: true,
    });
    return PrintProvidersResponseSchema.parse(response);
  }

  /**
   * Retrieve a specific print provider and associated blueprint offerings
   * 
   * @see https://developers.printify.com/#retrieve-a-specific-print-provider
   */
  async getPrintProvider(printProviderId: number): Promise<PrintProvider> {
    const response = await this.client.get<unknown>(
      `/catalog/print_providers/${printProviderId}.json`,
      { isCatalogEndpoint: true },
    );
    return PrintProviderSchema.parse(response);
  }

  /**
   * Retrieve all print providers that fulfill orders for a specific blueprint
   * 
   * @see https://developers.printify.com/#retrieve-a-list-of-all-print-providers-that-fulfill-orders-for-a-specific-blueprint
   */
  async getBlueprintPrintProviders(blueprintId: number): Promise<PrintProvider[]> {
    const response = await this.client.get<unknown>(
      `/catalog/blueprints/${blueprintId}/print_providers.json`,
      { isCatalogEndpoint: true },
    );
    return PrintProvidersResponseSchema.parse(response);
  }

  /**
   * ============================================================================
   * VARIANTS
   * ============================================================================
   */

  /**
   * Retrieve a list of variants for a specific blueprint and print provider
   * 
   * @see https://developers.printify.com/#retrieve-a-list-of-variants-of-a-blueprint-from-a-specific-print-provider
   */
  async getVariants(
    blueprintId: number,
    printProviderId: number,
    options: GetVariantsOptions = {},
  ): Promise<Variant[]> {
    const params: Record<string, string | number | boolean> = {};
    
    if (options.showOutOfStock !== undefined) {
      params["show-out-of-stock"] = options.showOutOfStock ? 1 : 0;
    }

    const response = await this.client.get<unknown>(
      `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
      {
        params,
        isCatalogEndpoint: true,
      },
    );

    const parsed = VariantsResponseSchema.parse(response);
    return parsed.variants;
  }

  /**
   * ============================================================================
   * SHIPPING
   * ============================================================================
   */

  /**
   * Retrieve shipping information for all variants of a blueprint from a print provider
   * 
   * @see https://developers.printify.com/#retrieve-shipping-information
   */
  async getShipping(
    blueprintId: number,
    printProviderId: number,
  ): Promise<ShippingResponse> {
    const response = await this.client.get<unknown>(
      `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping.json`,
      { isCatalogEndpoint: true },
    );
    return ShippingResponseSchema.parse(response);
  }
}
