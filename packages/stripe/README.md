# @muzo/stripe

Stripe integration package for MUZO payment processing.

## Features

- ✅ **Checkout Sessions**: Create secure payment sessions
- ✅ **Payment Verification**: Verify payments on success page
- ✅ **Webhook Support**: Handle Stripe webhooks (optional)
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Client & Server**: Both browser and server-side utilities

## Installation

```bash
pnpm add @muzo/stripe
```

## Server-Side Usage

```typescript
import { getStripeService } from '@muzo/stripe';

const stripe = getStripeService({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // optional
});

// Create a checkout session
const session = await stripe.createCheckoutSession({
  userId: 'user_123',
  projectId: 'project_456',
  orderId: 'order_789',
  productName: 'Puzzle Personnalisé 1000 pièces',
  productDescription: 'Puzzle avec votre création IA',
  amount: 1990, // 19.90 EUR in cents
  currency: 'eur',
  imageUrl: 'https://example.com/image.jpg',
  successUrl: 'https://muzo.app/success?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'https://muzo.app/cancel',
});

console.log('Redirect to:', session.url);

// Verify payment on success page
const verification = await stripe.verifyPayment(sessionId);
if (verification.isPaid) {
  console.log('Payment successful!');
}
```

## Client-Side Usage

```typescript
import { redirectToCheckout } from '@muzo/stripe/client';

// Redirect user to Stripe Checkout
await redirectToCheckout(
  sessionId,
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

## API Routes Example

### Create Checkout Session

```typescript
// app/api/checkout/route.ts
import { getStripeService } from '@muzo/stripe';

export async function POST(req: Request) {
  const { orderId, amount, productName } = await req.json();
  
  const stripe = getStripeService({
    secretKey: process.env.STRIPE_SECRET_KEY!,
  });
  
  const session = await stripe.createCheckoutSession({
    userId: 'user_123',
    projectId: 'project_456',
    orderId,
    productName,
    productDescription: 'Produit personnalisé MUZO',
    amount,
    currency: 'eur',
    successUrl: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${process.env.NEXTAUTH_URL}/cancel`,
  });
  
  return Response.json({ sessionId: session.id, url: session.url });
}
```

### Verify Payment on Success Page

```typescript
// app/success/page.tsx
import { getStripeService } from '@muzo/stripe';

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  
  const stripe = getStripeService({
    secretKey: process.env.STRIPE_SECRET_KEY!,
  });
  
  const verification = await stripe.verifyPayment(sessionId);
  
  if (verification.isPaid) {
    // Update order status in database
    await updateOrderStatus(verification.orderId!, 'PAID');
  }
  
  return <div>Payment successful!</div>;
}
```

## Environment Variables

```bash
# Server-side (required)
STRIPE_SECRET_KEY=sk_test_...

# Client-side (required)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook (optional)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Links

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
