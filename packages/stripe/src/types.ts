/**
 * ============================================================================
 * STRIPE TYPES
 * ============================================================================
 * 
 * Type definitions for Stripe integration
 */

import type Stripe from "stripe";

/**
 * Checkout session creation parameters
 */
export interface CreateCheckoutSessionParams {
  userId: string;
  projectId: string;
  orderId: string;
  productName: string;
  productDescription: string;
  amount: number; // in cents (e.g., 1990 = 19.90 EUR)
  currency: string; // e.g., "eur", "usd"
  imageUrl?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Checkout session response
 */
export interface CheckoutSession {
  id: string;
  url: string;
  status: Stripe.Checkout.Session.Status;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
  metadata: Record<string, string>;
}

/**
 * Webhook event types we handle
 */
export type StripeWebhookEvent =
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed";

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  orderId?: string;
  sessionId?: string;
}

/**
 * Payment verification result
 */
export interface PaymentVerification {
  isPaid: boolean;
  sessionId: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}
