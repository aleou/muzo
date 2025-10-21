/**
 * ============================================================================
 * STRIPE CLIENT SDK
 * ============================================================================
 * 
 * Client-side Stripe integration (browser)
 */

import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe.js instance (singleton)
 * 
 * @param publishableKey - Stripe publishable key (pk_test_... or pk_live_...)
 */
export function getStripeClient(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

/**
 * Redirect to Stripe Checkout
 * 
 * @param checkoutUrl - Direct checkout URL from Stripe session
 */
export async function redirectToCheckout(checkoutUrl: string): Promise<void> {
  if (typeof window !== "undefined") {
    window.location.href = checkoutUrl;
  }
}
