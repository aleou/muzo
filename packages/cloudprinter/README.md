# @muzo/cloudprinter

Official CloudPrinter API client for Node.js with TypeScript support.

## Features

- ✅ **Type-Safe**: Full TypeScript support with Zod schema validation
- ✅ **Complete API Coverage**: All CloudPrinter endpoints implemented
- ✅ **Error Handling**: Comprehensive error handling with detailed messages
- ✅ **Automatic Retries**: Built-in retry logic with exponential backoff
- ✅ **Modern**: Uses async/await and native fetch API

## Installation

```bash
pnpm add @muzo/cloudprinter
```

## Quick Start

```typescript
import { CloudPrinter } from '@muzo/cloudprinter';

const cloudprinter = new CloudPrinter({
  apiKey: process.env.CLOUDPRINTER_API_KEY,
});

// Browse the product catalog
const products = await cloudprinter.products.list();

// Get a price quote
const quote = await cloudprinter.quotes.getEUR('GB', [
  { product: 'product-reference', count: 100 }
]);

// Create an order
const order = await cloudprinter.orders.create({
  reference: 'my-order-123',
  email: 'customer@example.com',
  items: [
    {
      product: 'product-reference',
      count: 100,
      files: [
        {
          type: 'pdf',
          url: 'https://example.com/design.pdf',
          md5sum: 'abc123...',
        },
      ],
    },
  ],
  address: {
    name: 'John Doe',
    address1: '123 Main St',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'GB',
  },
});
```

## API Reference

### Products

List and search available products in the CloudPrinter catalog.

```typescript
// List all products
const products = await cloudprinter.products.list();

// Get product details
const product = await cloudprinter.products.get('product-reference');

// Search products
const results = await cloudprinter.products.search('business cards');

// Filter by category
const categoryProducts = await cloudprinter.products.getByCategory('cards');
```

### Quotes

Calculate pricing and shipping costs before placing orders.

```typescript
// Get a quote in EUR
const quote = await cloudprinter.quotes.getEUR('GB', [
  { product: 'product-ref', count: 100 }
]);

// Get a quote in USD
const quote = await cloudprinter.quotes.getUSD('US', [
  { product: 'product-ref', count: 50 }
]);

// Custom quote with options
const quote = await cloudprinter.quotes.get({
  currency: 'EUR',
  country: 'GB',
  items: [
    {
      product: 'product-ref',
      count: 100,
      options: {
        lamination: 'glossy',
        corners: 'rounded',
      },
    },
  ],
});
```

### Orders

Create, manage, and track orders.

```typescript
// List all orders
const orders = await cloudprinter.orders.list();

// Get order details
const order = await cloudprinter.orders.get('order-reference');

// Create a new order
const newOrder = await cloudprinter.orders.create({
  reference: 'unique-order-ref',
  email: 'customer@example.com',
  shipping: 'express',
  items: [
    {
      product: 'product-ref',
      count: 100,
      options: {
        lamination: 'matte',
      },
      files: [
        {
          type: 'pdf',
          url: 'https://example.com/design.pdf',
          md5sum: 'file-checksum',
        },
      ],
    },
  ],
  address: {
    name: 'Jane Smith',
    address1: '456 High Street',
    city: 'Manchester',
    postcode: 'M1 1AA',
    country: 'GB',
  },
});

// Cancel an order
await cloudprinter.orders.cancel('order-reference');

// Get order processing log
const log = await cloudprinter.orders.getLog('order-reference');
```

### Shipping

Get shipping information and country data.

```typescript
// List available shipping levels
const levels = await cloudprinter.shipping.listLevels();

// List shipping countries
const countries = await cloudprinter.shipping.listCountries();

// List states/regions for a country
const states = await cloudprinter.shipping.listStates('US');

// Check if a country requires state information
const needsState = await cloudprinter.shipping.requiresState('US');
```

## Important Notes

### File Requirements

CloudPrinter requires **PDF files** with MD5 checksums for all orders:

```typescript
{
  type: 'pdf',
  url: 'https://your-server.com/design.pdf',
  md5sum: 'calculated-md5-checksum',
}
```

You'll need to:
1. Convert images to PDF format
2. Upload PDFs to a publicly accessible URL
3. Calculate MD5 checksum of the PDF file

### API Differences from Other Providers

- **POST-only API**: All endpoints use POST requests (not REST standard)
- **No Auto Mockups**: You need to provide production-ready PDFs
- **Simpler Auth**: API key in request body (no Bearer tokens)
- **Global Shipping**: Lower costs and worldwide availability

## Error Handling

The SDK throws `CloudPrinterApiError` for API errors:

```typescript
import { CloudPrinterApiError } from '@muzo/cloudprinter';

try {
  const order = await cloudprinter.orders.create({...});
} catch (error) {
  if (error instanceof CloudPrinterApiError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Response:', error.response);
  }
}
```

## Configuration

```typescript
const cloudprinter = new CloudPrinter({
  apiKey: 'your-api-key',        // Required
  baseUrl?: 'custom-base-url',   // Optional, defaults to CloudPrinter API
});
```

## Type Safety

All API responses are validated with Zod schemas:

```typescript
import type {
  Product,
  ProductDetails,
  OrderDetails,
  QuoteResponse,
} from '@muzo/cloudprinter/types';

const product: Product = await cloudprinter.products.get('ref');
const quote: QuoteResponse = await cloudprinter.quotes.getEUR('GB', items);
```

## Links

- [CloudPrinter API Documentation](https://www.cloudprinter.com/docs)
- [CloudPrinter Website](https://www.cloudprinter.com)

## License

MIT
