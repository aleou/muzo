/**
 * ============================================================================
 * UPLOADS SERVICE
 * ============================================================================
 * 
 * Manages image uploads to Printify Media Library
 */

import type { PrintifyClient } from "../client";
import {
  UploadedImageSchema,
  createPaginatedSchema,
  type UploadedImage,
  type UploadImageRequest,
  type PaginationOptions,
} from "../types";

const PaginatedUploadsSchema = createPaginatedSchema(UploadedImageSchema);

export class UploadsService {
  constructor(private client: PrintifyClient) {}

  /**
   * Retrieve a list of uploaded images
   * 
   * @see https://developers.printify.com/#retrieve-a-list-of-uploaded-images
   */
  async list(options: PaginationOptions = {}) {
    const params: Record<string, number | undefined> = {
      page: options.page,
      limit: options.limit,
    };

    const response = await this.client.get<unknown>("/uploads.json", { params });
    return PaginatedUploadsSchema.parse(response);
  }

  /**
   * Retrieve an uploaded image by ID
   * 
   * @see https://developers.printify.com/#retrieve-an-uploaded-image-by-id
   */
  async get(imageId: string): Promise<UploadedImage> {
    const response = await this.client.get<unknown>(`/uploads/${imageId}.json`);
    return UploadedImageSchema.parse(response);
  }

  /**
   * Upload an image to Printify Media Library
   * 
   * Supports two methods:
   * 1. Upload via URL (recommended for files > 5MB)
   * 2. Upload via base64-encoded contents
   * 
   * @see https://developers.printify.com/#upload-an-image
   */
  async upload(request: UploadImageRequest): Promise<UploadedImage> {
    const response = await this.client.post<unknown>("/uploads/images.json", request);
    return UploadedImageSchema.parse(response);
  }

  /**
   * Archive an uploaded image
   * 
   * @see https://developers.printify.com/#archive-an-uploaded-image
   */
  async archive(imageId: string): Promise<void> {
    await this.client.post<void>(`/uploads/${imageId}/archive.json`);
  }
}
