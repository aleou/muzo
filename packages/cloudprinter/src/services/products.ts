/**
 * ============================================================================
 * PRODUCTS SERVICE
 * ============================================================================
 * 
 * Manages CloudPrinter product catalog
 */

import type { CloudPrinterClient } from "../client";
import {
  ProductsListSchema,
  ProductDetailsSchema,
  type ProductsList,
  type ProductDetails,
  type Product,
} from "../types";

export class ProductsService {
  constructor(private client: CloudPrinterClient) {}

  /**
   * List all products enabled for the account
   * 
   * @see https://www.cloudprinter.com/docs#list-all-products
   */
  async list(): Promise<ProductsList> {
    const response = await this.client.post<unknown>("/products");
    return ProductsListSchema.parse(response);
  }

  /**
   * Get detailed information about a specific product
   * Including options, specs, and pricing
   * 
   * @see https://www.cloudprinter.com/docs#product-info
   */
  async get(reference: string): Promise<ProductDetails> {
    const response = await this.client.post<unknown>("/products/info", {
      reference,
    });
    return ProductDetailsSchema.parse(response);
  }

  /**
   * Get products by category
   */
  async getByCategory(category: string): Promise<ProductsList> {
    const allProducts = await this.list();
    return allProducts.filter((product: Product) =>
      product.category?.toLowerCase().includes(category.toLowerCase()),
    );
  }

  /**
   * Search products by name or note
   */
  async search(query: string): Promise<ProductsList> {
    const allProducts = await this.list();
    const lowerQuery = query.toLowerCase();
    return allProducts.filter(
      (product: Product) =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.note?.toLowerCase().includes(lowerQuery),
    );
  }
}
