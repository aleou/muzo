# @muzo/printify

Professional TypeScript SDK for Printify API with full type safety, automatic rate limiting, and comprehensive error handling.

## Features

✅ **Type-Safe** - Full TypeScript support with Zod validation  
✅ **Rate Limiting** - Automatic rate limiting (600 req/min global, 100 req/min catalog)  
✅ **Auto-Retry** - Exponential backoff for transient errors  
✅ **Error Handling** - Comprehensive error messages with status codes  
✅ **Modern API** - Promise-based with async/await  
✅ **Well-Documented** - JSDoc comments for all methods

## Installation

```bash
pnpm add @muzo/printify
```

## Quick Start

```typescript
import { Printify } from '@muzo/printify';

const printify = new Printify({
  apiToken: process.env.PRINTIFY_API_TOKEN!,
  shopId: 123456, // Optional: required for products operations
});

// List all blueprints (products in catalog)
const blueprints = await printify.catalog.getBlueprints();

// Get variants for a specific blueprint and print provider
const variants = await printify.catalog.getVariants(384, 1);

// Upload an image
const image = await printify.uploads.upload({
  file_name: 'artwork.png',
  url: 'https://example.com/artwork.png',
});

// Create a product with mockups
const product = await printify.products.create({
  title: 'My Product',
  description: 'Product description',
  blueprint_id: 384,
  print_provider_id: 1,
  variants: [
    { id: 45740, price: 2000, is_enabled: true },
  ],
  print_areas: [
    {
      variant_ids: [45740],
      placeholders: [
        {
          position: 'front',
          images: [
            {
              id: image.id,
              x: 0.5,
              y: 0.5,
              scale: 1,
              angle: 0,
            },
          ],
        },
      ],
    },
  ],
});

// Mockup URLs are automatically generated
console.log(product.images);
```

## API Reference

### Catalog

```typescript
// Get all blueprints
const blueprints = await printify.catalog.getBlueprints();

// Get specific blueprint
const blueprint = await printify.catalog.getBlueprint(384);

// Get print providers for a blueprint
const providers = await printify.catalog.getBlueprintPrintProviders(384);

// Get variants
const variants = await printify.catalog.getVariants(384, 1, {
  showOutOfStock: false,
});

// Get shipping info
const shipping = await printify.catalog.getShipping(384, 1);
```

### Uploads

```typescript
// Upload via URL (recommended for files > 5MB)
const image = await printify.uploads.upload({
  file_name: 'artwork.png',
  url: 'https://example.com/artwork.png',
});

// Upload via base64
const image = await printify.uploads.upload({
  file_name: 'artwork.png',
  contents: 'base64-encoded-content',
});

// List uploaded images
const uploads = await printify.uploads.list({ page: 1, limit: 10 });

// Get specific image
const image = await printify.uploads.get('image-id');

// Archive image
await printify.uploads.archive('image-id');
```

### Products

```typescript
// Create product
const product = await printify.products.create({
  title: 'Product Title',
  description: 'Description',
  blueprint_id: 384,
  print_provider_id: 1,
  variants: [{ id: 45740, price: 2000, is_enabled: true }],
  print_areas: [/* ... */],
});

// List products
const products = await printify.products.list({ page: 1, limit: 10 });

// Get product
const product = await printify.products.get('product-id');

// Update product
const updated = await printify.products.update('product-id', {
  title: 'New Title',
});

// Delete product
await printify.products.delete('product-id');
```

### Shops

```typescript
// List shops
const shops = await printify.shops.list();

// Disconnect shop
await printify.shops.disconnect(123456);
```

## Rate Limiting

The SDK automatically handles Printify's rate limits:

- **Global**: 600 requests per minute
- **Catalog**: 100 requests per minute (in addition to global limit)

When limits are reached, requests are automatically queued and retried.

```typescript
// Check current rate limit status
const status = printify.getRateLimitStatus();
console.log(status);
// {
//   globalRequests: 42,
//   globalLimit: 600,
//   catalogRequests: 5,
//   catalogLimit: 100
// }
```

## Error Handling

```typescript
import { PrintifyApiError } from '@muzo/printify';

try {
  const product = await printify.products.get('invalid-id');
} catch (error) {
  if (error instanceof PrintifyApiError) {
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Endpoint:', error.endpoint);
    console.error('Response:', error.response);
  }
}
```

## Image Positioning

Printify uses a coordinate system from [0, 0] to [1, 1]:

- **x, y**: Position (0.5, 0.5 = center)
- **scale**: Size relative to print area (1 = full width)
- **angle**: Rotation in degrees (0-360)

```typescript
{
  id: 'image-id',
  x: 0.5,      // Center horizontally
  y: 0.5,      // Center vertically
  scale: 1,    // Full width
  angle: 0,    // No rotation
}
```

## Configuration

```typescript
const printify = new Printify({
  apiToken: 'your-token',        // Required
  shopId: 123456,                // Optional: for products operations
  baseUrl: 'https://...',        // Optional: custom API URL
  userAgent: 'MyApp/1.0',        // Optional: custom user agent
  timeout: 30000,                // Optional: request timeout (ms)
});
```

## License

MIT
