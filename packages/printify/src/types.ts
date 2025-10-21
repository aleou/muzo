import { z } from "zod";

/**
 * ============================================================================
 * COMMON TYPES
 * ============================================================================
 */

export const PrintifyErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.array(z.string())).optional(),
});

export type PrintifyError = z.infer<typeof PrintifyErrorSchema>;

/**
 * ============================================================================
 * SHOP TYPES
 * ============================================================================
 */

export const ShopSchema = z.object({
  id: z.number(),
  title: z.string(),
  sales_channel: z.string(),
});

export type Shop = z.infer<typeof ShopSchema>;

export const ShopsResponseSchema = z.array(ShopSchema);

export type ShopsResponse = z.infer<typeof ShopsResponseSchema>;

/**
 * ============================================================================
 * CATALOG TYPES - BLUEPRINTS
 * ============================================================================
 */

export const BlueprintSchema = z.object({
  id: z.number(),
  title: z.string(),
  brand: z.string(),
  model: z.string(),
  images: z.array(z.string()),
  description: z.string().optional(),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

export const BlueprintsResponseSchema = z.array(BlueprintSchema);

export type BlueprintsResponse = z.infer<typeof BlueprintsResponseSchema>;

/**
 * ============================================================================
 * CATALOG TYPES - PRINT PROVIDERS
 * ============================================================================
 */

export const LocationSchema = z.object({
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  region: z.string(),
  zip: z.string(),
});

export type Location = z.infer<typeof LocationSchema>;

export const PrintProviderSchema = z.object({
  id: z.number(),
  title: z.string(),
  location: LocationSchema.optional(),
});

export type PrintProvider = z.infer<typeof PrintProviderSchema>;

export const PrintProvidersResponseSchema = z.array(PrintProviderSchema);

export type PrintProvidersResponse = z.infer<typeof PrintProvidersResponseSchema>;

/**
 * ============================================================================
 * CATALOG TYPES - VARIANTS
 * ============================================================================
 */

export const PlaceholderSchema = z.object({
  position: z.string(),
  height: z.number(),
  width: z.number(),
});

export type Placeholder = z.infer<typeof PlaceholderSchema>;

export const VariantOptionsSchema = z.record(z.string());

export type VariantOptions = z.infer<typeof VariantOptionsSchema>;

export const VariantSchema = z.object({
  id: z.number(),
  title: z.string(),
  options: VariantOptionsSchema,
  placeholders: z.array(PlaceholderSchema),
  is_available: z.boolean().optional(),
  cost: z.number().optional(),
});

export type Variant = z.infer<typeof VariantSchema>;

export const VariantsResponseSchema = z.object({
  variants: z.array(VariantSchema),
});

export type VariantsResponse = z.infer<typeof VariantsResponseSchema>;

/**
 * ============================================================================
 * CATALOG TYPES - SHIPPING
 * ============================================================================
 */

export const HandlingTimeSchema = z.object({
  value: z.number(),
  unit: z.string(),
});

export type HandlingTime = z.infer<typeof HandlingTimeSchema>;

export const ShippingCostSchema = z.object({
  currency: z.string(),
  cost: z.number(),
});

export type ShippingCost = z.infer<typeof ShippingCostSchema>;

export const ShippingProfileSchema = z.object({
  variant_ids: z.array(z.number()),
  first_item: ShippingCostSchema,
  additional_items: ShippingCostSchema,
  countries: z.array(z.string()),
});

export type ShippingProfile = z.infer<typeof ShippingProfileSchema>;

export const ShippingResponseSchema = z.object({
  handling_time: HandlingTimeSchema,
  profiles: z.array(ShippingProfileSchema),
});

export type ShippingResponse = z.infer<typeof ShippingResponseSchema>;

/**
 * ============================================================================
 * UPLOAD TYPES
 * ============================================================================
 */

export const UploadedImageSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  height: z.number(),
  width: z.number(),
  size: z.number(),
  mime_type: z.string(),
  preview_url: z.string(),
  upload_time: z.string(),
});

export type UploadedImage = z.infer<typeof UploadedImageSchema>;

export const UploadImageRequestSchema = z.union([
  z.object({
    file_name: z.string(),
    url: z.string(),
  }),
  z.object({
    file_name: z.string(),
    contents: z.string(),
  }),
]);

export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>;

/**
 * ============================================================================
 * PRODUCT TYPES
 * ============================================================================
 */

export const ImagePositionSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  angle: z.number(),
});

export type ImagePosition = z.infer<typeof ImagePositionSchema>;

export const PrintAreaPlaceholderSchema = z.object({
  position: z.string(),
  images: z.array(ImagePositionSchema),
});

export type PrintAreaPlaceholder = z.infer<typeof PrintAreaPlaceholderSchema>;

export const PrintAreaSchema = z.object({
  variant_ids: z.array(z.number()),
  placeholders: z.array(PrintAreaPlaceholderSchema),
});

export type PrintArea = z.infer<typeof PrintAreaSchema>;

export const ProductVariantSchema = z.object({
  id: z.number(),
  price: z.number(),
  is_enabled: z.boolean().optional(),
  is_default: z.boolean().optional(),
  sku: z.string().optional(),
  cost: z.number().optional(),
  title: z.string().optional(),
  grams: z.number().optional(),
  is_available: z.boolean().optional(),
  is_printify_express_eligible: z.boolean().optional(),
  options: z.array(z.number()).optional(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const MockupImageSchema = z.object({
  src: z.string(),
  variant_ids: z.array(z.number()),
  position: z.string(),
  is_default: z.boolean(),
});

export type MockupImage = z.infer<typeof MockupImageSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
  blueprint_id: z.number(),
  print_provider_id: z.number(),
  variants: z.array(ProductVariantSchema),
  print_areas: z.array(PrintAreaSchema),
  images: z.array(MockupImageSchema),
  created_at: z.string(),
  updated_at: z.string(),
  visible: z.boolean().optional(),
  is_locked: z.boolean().optional(),
  shop_id: z.number().optional(),
  user_id: z.number().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductRequestSchema = z.object({
  title: z.string(),
  description: z.string(),
  blueprint_id: z.number(),
  print_provider_id: z.number(),
  variants: z.array(ProductVariantSchema),
  print_areas: z.array(PrintAreaSchema),
  tags: z.array(z.string()).optional(),
});

export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

/**
 * ============================================================================
 * PAGINATION TYPES
 * ============================================================================
 */

export const PaginationMetaSchema = z.object({
  current_page: z.number(),
  from: z.number().nullable(),
  to: z.number().nullable(),
  per_page: z.number(),
  total: z.number(),
  last_page: z.number(),
  first_page_url: z.string().nullable(),
  last_page_url: z.string().nullable(),
  next_page_url: z.string().nullable(),
  prev_page_url: z.string().nullable(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function createPaginatedSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    current_page: z.number(),
    data: z.array(dataSchema),
    first_page_url: z.string().nullable(),
    from: z.number().nullable(),
    last_page: z.number(),
    last_page_url: z.string().nullable(),
    next_page_url: z.string().nullable(),
    path: z.string().nullable(),
    per_page: z.number(),
    prev_page_url: z.string().nullable(),
    to: z.number().nullable(),
    total: z.number(),
  });
}

/**
 * ============================================================================
 * API CLIENT CONFIGURATION
 * ============================================================================
 */

export interface PrintifyClientConfig {
  apiToken: string;
  shopId?: number;
  baseUrl?: string;
  userAgent?: string;
  timeout?: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  catalogMaxRequests?: number;
}

/**
 * ============================================================================
 * REQUEST OPTIONS
 * ============================================================================
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface GetVariantsOptions {
  showOutOfStock?: boolean;
}
