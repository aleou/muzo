/**
 * ============================================================================
 * SHIPPING SERVICE
 * ============================================================================
 * 
 * Manages shipping levels, countries, and states
 */

import type { CloudPrinterClient } from "../client";
import {
  ShippingLevelsSchema,
  ShippingCountriesSchema,
  ShippingStatesSchema,
  type ShippingLevels,
  type ShippingCountries,
  type ShippingStates,
} from "../types";

export class ShippingService {
  constructor(private client: CloudPrinterClient) {}

  /**
   * List available shipping levels
   * 
   * @see https://www.cloudprinter.com/docs#list-shipping-levels
   */
  async listLevels(): Promise<ShippingLevels> {
    const response = await this.client.post<unknown>("/shipping/levels");
    return ShippingLevelsSchema.parse(response);
  }

  /**
   * List available shipping countries
   * 
   * @see https://www.cloudprinter.com/docs#shipping-countries
   */
  async listCountries(): Promise<ShippingCountries> {
    const response = await this.client.post<unknown>("/shipping/countries");
    return ShippingCountriesSchema.parse(response);
  }

  /**
   * List shipping states/regions for a specific country
   * 
   * @see https://www.cloudprinter.com/docs#shipping-states-regions
   */
  async listStates(countryReference: string): Promise<ShippingStates> {
    const response = await this.client.post<unknown>("/shipping/states", {
      country_reference: countryReference,
    });
    return ShippingStatesSchema.parse(response);
  }

  /**
   * Check if a country requires state information
   */
  async requiresState(countryReference: string): Promise<boolean> {
    const countries = await this.listCountries();
    const country = countries.find((c: { country_reference?: string; require_state?: number }) => 
      c.country_reference === countryReference
    );
    return country?.require_state === 1;
  }
}
