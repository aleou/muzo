import { z } from "zod";

/**
 * ============================================================================
 * COMMON TYPES
 * ============================================================================
 */

export const CloudPrinterErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.array(z.string())).optional(),
});

export type CloudPrinterError = z.infer<typeof CloudPrinterErrorSchema>;

/**
 * ============================================================================
 * ORDER TYPES
 * ============================================================================
 */

export const OrderStateSchema = z.object({
  reference: z.string(),
  order_date: z.string(),
  state: z.string(),
  state_code: z.string(),
});

export type OrderState = z.infer<typeof OrderStateSchema>;

export const OrdersListSchema = z.array(OrderStateSchema);

export type OrdersList = z.infer<typeof OrdersListSchema>;

/**
 * Order details types
 */
export const AddressSchema = z.object({
  type: z.string(),
  company: z.string().optional(),
  firstname: z.string(),
  lastname: z.string(),
  street1: z.string(),
  street2: z.string().optional(),
  zip: z.string(),
  city: z.string(),
  state: z.string().optional(),
  country: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  customer_identification: z.string().optional(),
});

export type Address = z.infer<typeof AddressSchema>;

export const OrderFileSchema = z.object({
  type: z.string(),
  url: z.string(),
  md5sum: z.string(),
});

export type OrderFile = z.infer<typeof OrderFileSchema>;

export const OrderOptionSchema = z.object({
  type: z.string(),
  count: z.string(),
});

export type OrderOption = z.infer<typeof OrderOptionSchema>;

export const OrderItemSchema = z.object({
  reference: z.string(),
  name: z.string(),
  count: z.string(),
  shipping_option: z.string().optional(),
  tracking: z.string().optional(),
  options: z.array(OrderOptionSchema),
  files: z.array(OrderFileSchema),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderDetailsSchema = z.object({
  reference: z.string(),
  state: z.string(),
  state_code: z.string(),
  order_date: z.string(),
  email: z.string(),
  addresses: z.array(AddressSchema),
  items: z.array(OrderItemSchema),
});

export type OrderDetails = z.infer<typeof OrderDetailsSchema>;

/**
 * Order creation types
 */
export const CreateOrderItemFileSchema = z.object({
  type: z.enum(["product", "cover", "book", "box"]), // Added "box" for puzzle box files
  url: z.string(),
  md5sum: z.string(),
});

export type CreateOrderItemFile = z.infer<typeof CreateOrderItemFileSchema>;

export const CreateOrderItemSchema = z.object({
  reference: z.string(),
  product: z.string(),
  shipping_level: z.string().optional(),
  quote: z.string().optional(),
  title: z.string(),
  count: z.string(),
  price: z.string().optional(),
  currency: z.string().optional(),
  hc: z.string().optional(),
  files: z.array(CreateOrderItemFileSchema),
  options: z.array(OrderOptionSchema),
  reorder_cause: z.string().optional(),
  reorder_desc: z.string().optional(),
  reorder_order_reference: z.string().optional(),
  reorder_item_reference: z.string().optional(),
});

export type CreateOrderItem = z.infer<typeof CreateOrderItemSchema>;

export const CreateOrderFileSchema = z.object({
  type: z.enum(["delivery_note", "promotion"]),
  url: z.string(),
  md5sum: z.string(),
});

export type CreateOrderFile = z.infer<typeof CreateOrderFileSchema>;

export const CreateOrderRequestSchema = z.object({
  reference: z.string(),
  email: z.string(),
  price: z.string().optional(),
  currency: z.string().optional(),
  hc: z.string().optional(),
  meta: z.array(z.unknown()).optional(),
  addresses: z.array(AddressSchema),
  files: z.array(CreateOrderFileSchema).optional(),
  items: z.array(CreateOrderItemSchema),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const CreateOrderResponseSchema = z.object({
  order: z.string(),
});

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

/**
 * Order log types
 */
export const OrderLogEntrySchema = z.object({
  reference: z.string(),
  create_date: z.string(),
  state: z.string(),
});

export type OrderLogEntry = z.infer<typeof OrderLogEntrySchema>;

export const OrderLogSchema = z.array(OrderLogEntrySchema);

export type OrderLog = z.infer<typeof OrderLogSchema>;

/**
 * ============================================================================
 * QUOTE TYPES
 * ============================================================================
 */

export const QuoteItemSchema = z.object({
  reference: z.string(),
  product: z.string(),
  count: z.string(),
  options: z.array(OrderOptionSchema),
});

export type QuoteItem = z.infer<typeof QuoteItemSchema>;

export const QuoteRequestSchema = z.object({
  country: z.string(),
  state: z.string().optional(),
  currency: z.string().optional(),
  items: z.array(QuoteItemSchema),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const ShippingQuoteSchema = z.object({
  quote: z.string(),
  service: z.string(),
  shipping_level: z.string(),
  shipping_option: z.string(),
  price: z.string(),
  vat: z.string(),
  currency: z.string(),
});

export type ShippingQuote = z.infer<typeof ShippingQuoteSchema>;

export const ShipmentSchema = z.object({
  total_weight: z.string(),
  items: z.array(z.object({ reference: z.string() })),
  quotes: z.array(ShippingQuoteSchema),
});

export type Shipment = z.infer<typeof ShipmentSchema>;

export const QuoteResponseSchema = z.object({
  price: z.string(),
  vat: z.string(),
  currency: z.string(),
  expire_date: z.string(),
  subtotals: z.object({
    items: z.string(),
    fee: z.string(),
    app_fee: z.string(),
  }),
  shipments: z.array(ShipmentSchema),
  invoice_currency: z.string(),
  invoice_exchange_rate: z.string(),
});

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

/**
 * ============================================================================
 * PRODUCT TYPES
 * ============================================================================
 */

export const ProductSchema = z.object({
  name: z.string(),
  note: z.string().optional(),
  reference: z.string(),
  category: z.string().optional(),
  from_price: z.string().optional(),
  currency: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductsListSchema = z.array(ProductSchema);

export type ProductsList = z.infer<typeof ProductsListSchema>;

/**
 * Product details types
 */
export const ProductOptionSchema = z.object({
  reference: z.string(),
  note: z.string().optional(),
  type: z.string(),
  default: z.number().optional(),
});

export type ProductOption = z.infer<typeof ProductOptionSchema>;

export const ProductSpecSchema = z.object({
  note: z.string().optional(),
  value: z.string(),
});

export type ProductSpec = z.infer<typeof ProductSpecSchema>;

export const ProductDetailsSchema = z.object({
  name: z.string(),
  note: z.string().optional(),
  reference: z.string(),
  options: z.array(ProductOptionSchema).optional(),
  specs: z.array(ProductSpecSchema).optional(),
});

export type ProductDetails = z.infer<typeof ProductDetailsSchema>;

/**
 * ============================================================================
 * SHIPPING TYPES
 * ============================================================================
 */

export const ShippingLevelSchema = z.object({
  shipping_level_reference: z.string().optional(),
  shipping_level: z.string().optional(),
  name: z.string().optional(),
  note: z.string().optional(),
});

export type ShippingLevel = z.infer<typeof ShippingLevelSchema>;

export const ShippingLevelsSchema = z.array(ShippingLevelSchema);

export type ShippingLevels = z.infer<typeof ShippingLevelsSchema>;

export const ShippingCountrySchema = z.object({
  country_reference: z.string().optional(),
  note: z.string().optional(),
  require_state: z.number().optional(),
});

export type ShippingCountry = z.infer<typeof ShippingCountrySchema>;

export const ShippingCountriesSchema = z.array(ShippingCountrySchema);

export type ShippingCountries = z.infer<typeof ShippingCountriesSchema>;

export const ShippingStateSchema = z.object({
  state_reference: z.string().optional(),
  name: z.string().optional(),
  note: z.string().optional(),
});

export type ShippingState = z.infer<typeof ShippingStateSchema>;

export const ShippingStatesSchema = z.array(ShippingStateSchema);

export type ShippingStates = z.infer<typeof ShippingStatesSchema>;

/**
 * ============================================================================
 * API CLIENT CONFIGURATION
 * ============================================================================
 */

export interface CloudPrinterClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * ============================================================================
 * UTILITY TYPES
 * ============================================================================
 */

export interface MD5HashResult {
  hash: string;
  file: File | Buffer;
}

export interface FileValidation {
  url: string;
  md5sum: string;
  isValid: boolean;
}
