/**
 * ============================================================================
 * STRIPE SERVER SDK
 * ============================================================================
 * 
 * Server-side Stripe integration for payment processing
 */

import Stripe from "stripe";
import type {
  CreateCheckoutSessionParams,
  CheckoutSession,
  PaymentVerification,
} from "./types";

export * from "./types";

/**
 * Stripe client configuration
 */
export interface StripeConfig {
  secretKey: string;
  webhookSecret?: string;
  apiVersion?: Stripe.LatestApiVersion;
}

/**
 * Stripe service class
 * Handles checkout sessions, payments, and webhooks
 */
export class StripeService {
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion || "2025-02-24.acacia",
      typescript: true,
    });
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * Create a Checkout Session
   * 
   * @see https://stripe.com/docs/api/checkout/sessions/create
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: params.productName,
              description: params.productDescription,
              images: params.imageUrl ? [params.imageUrl] : undefined,
            },
            unit_amount: params.amount, // in cents
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        projectId: params.projectId,
        orderId: params.orderId,
        ...params.metadata,
      },
      customer_email: undefined, // Will be filled by customer at checkout
      allow_promotion_codes: true,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["FR", "BE", "CH", "DE", "ES", "IT", "PT", "NL", "LU", "GB", "US", "CA"],
      },
    });

    return {
      id: session.id,
      url: session.url!,
      status: session.status!,
      paymentStatus: session.payment_status,
      metadata: session.metadata || {},
    };
  }

  /**
   * Retrieve a Checkout Session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Verify a payment by session ID
   * Used on success page to confirm payment
   */
  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    return {
      isPaid: session.payment_status === "paid",
      sessionId: session.id,
      orderId: session.metadata?.orderId,
      amount: session.amount_total || undefined,
      currency: session.currency || undefined,
      customerEmail: session.customer_details?.email || undefined,
      metadata: session.metadata || undefined,
    };
  }

  /**
   * Construct webhook event from raw body and signature
   * 
   * @throws Error if signature verification fails
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    if (!this.webhookSecret) {
      throw new Error("Webhook secret not configured");
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );
  }

  /**
   * Get Stripe instance for advanced operations
   */
  getStripe(): Stripe {
    return this.stripe;
  }
}

/**
 * Create a singleton Stripe service instance
 */
let stripeService: StripeService | null = null;

export function getStripeService(config: StripeConfig): StripeService {
  if (!stripeService) {
    stripeService = new StripeService(config);
  }
  return stripeService;
}
