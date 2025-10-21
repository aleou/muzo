/**
 * ============================================================================
 * PRODUCTS SERVICE
 * ============================================================================
 * 
 * Manages products in a Printify shop
 */

import type { PrintifyClient } from "../client";
import {
  ProductSchema,
  createPaginatedSchema,
  type Product,
  type CreateProductRequest,
  type PaginationOptions,
} from "../types";

const PaginatedProductsSchema = createPaginatedSchema(ProductSchema);

export class ProductsService {
  constructor(private client: PrintifyClient) {}

  /**
   * Retrieve a list of products in a shop
   * 
   * @see https://developers.printify.com/#retrieve-a-list-of-products
   */
  async list(options: PaginationOptions = {}) {
    const shopId = this.client.getShopId();
    const params: Record<string, number | undefined> = {
      page: options.page,
      limit: options.limit,
    };

    const response = await this.client.get<unknown>(`/shops/${shopId}/products.json`, {
      params,
    });
    return PaginatedProductsSchema.parse(response);
  }

  /**
   * Retrieve a specific product by ID
   * 
   * @see https://developers.printify.com/#retrieve-a-product
   */
  async get(productId: string): Promise<Product> {
    const shopId = this.client.getShopId();
    const response = await this.client.get<unknown>(
      `/shops/${shopId}/products/${productId}.json`,
    );
    return ProductSchema.parse(response);
  }

  /**
   * Create a new product
   * 
   * @see https://developers.printify.com/#create-a-new-product
   */
  async create(request: CreateProductRequest): Promise<Product> {
    const shopId = this.client.getShopId();
    const response = await this.client.post<unknown>(
      `/shops/${shopId}/products.json`,
      request,
    );
    return ProductSchema.parse(response);
  }

  /**
   * Update a product (partial or full update)
   * 
   * @see https://developers.printify.com/#update-a-product
   */
  async update(productId: string, updates: Partial<CreateProductRequest>): Promise<Product> {
    const shopId = this.client.getShopId();
    const response = await this.client.put<unknown>(
      `/shops/${shopId}/products/${productId}.json`,
      updates,
    );
    return ProductSchema.parse(response);
  }

  /**
   * Delete a product
   * 
   * @see https://developers.printify.com/#delete-a-product
   */
  async delete(productId: string): Promise<void> {
    const shopId = this.client.getShopId();
    await this.client.delete<void>(`/shops/${shopId}/products/${productId}.json`);
  }

  /**
   * Publish a product (triggers webhook if configured)
   * 
   * @see https://developers.printify.com/#publish-a-product
   */
  async publish(
    productId: string,
    options: {
      title?: boolean;
      description?: boolean;
      images?: boolean;
      variants?: boolean;
      tags?: boolean;
      keyFeatures?: boolean;
      shipping_template?: boolean;
    } = {},
  ): Promise<void> {
    const shopId = this.client.getShopId();
    await this.client.post<void>(`/shops/${shopId}/products/${productId}/publish.json`, {
      title: options.title ?? true,
      description: options.description ?? true,
      images: options.images ?? true,
      variants: options.variants ?? true,
      tags: options.tags ?? true,
      keyFeatures: options.keyFeatures ?? true,
      shipping_template: options.shipping_template ?? true,
    });
  }

  /**
   * Set product publish status to succeeded
   * 
   * @see https://developers.printify.com/#set-product-publish-status-to-succeeded
   */
  async publishingSucceeded(
    productId: string,
    external: { id: string; handle: string },
  ): Promise<void> {
    const shopId = this.client.getShopId();
    await this.client.post<void>(
      `/shops/${shopId}/products/${productId}/publishing_succeeded.json`,
      { external },
    );
  }

  /**
   * Set product publish status to failed
   * 
   * @see https://developers.printify.com/#set-product-publish-status-to-failed
   */
  async publishingFailed(productId: string, reason: string): Promise<void> {
    const shopId = this.client.getShopId();
    await this.client.post<void>(
      `/shops/${shopId}/products/${productId}/publishing_failed.json`,
      { reason },
    );
  }

  /**
   * Notify that a product has been unpublished
   * 
   * @see https://developers.printify.com/#notify-that-a-product-has-been-unpublished
   */
  async unpublish(productId: string): Promise<void> {
    const shopId = this.client.getShopId();
    await this.client.post<void>(`/shops/${shopId}/products/${productId}/unpublish.json`);
  }
}
