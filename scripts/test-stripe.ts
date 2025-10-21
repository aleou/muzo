/**
 * ============================================================================
 * STRIPE INTEGRATION TEST SCRIPT
 * ============================================================================
 * 
 * Test Stripe integration and API connectivity
 */

import { config } from "dotenv";
config();

import { getStripeService } from "../packages/stripe/src/index";

async function testStripeIntegration() {
  console.log("🧪 Testing Stripe Integration...\n");

  // Check for API key
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("❌ Error: STRIPE_SECRET_KEY environment variable not set");
    process.exit(1);
  }

  console.log("✅ STRIPE_SECRET_KEY found");
  console.log(`   Key: ${secretKey.slice(0, 15)}...${secretKey.slice(-4)}\n`);

  // Initialize Stripe service
  const stripe = getStripeService({
    secretKey,
  });
  console.log("✅ Stripe service initialized\n");

  try {
    // Test 1: Create a test checkout session
    console.log("📦 Test 1: Creating checkout session...");
    const session = await stripe.createCheckoutSession({
      userId: "test-user-123",
      projectId: "test-project-456",
      orderId: "test-order-789",
      productName: "Test Product - Puzzle 1000 pièces",
      productDescription: "Test checkout session for Stripe integration",
      amount: 1990, // 19.90 EUR
      currency: "eur",
      successUrl: "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://localhost:3000/cancel",
      metadata: {
        test: "true",
      },
    });

    console.log("✅ Checkout session created:");
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Payment Status: ${session.paymentStatus}`);
    console.log(`   URL: ${session.url}\n`);

    // Test 2: Retrieve the session
    console.log("📋 Test 2: Retrieving session...");
    const retrievedSession = await stripe.getCheckoutSession(session.id);
    console.log("✅ Session retrieved:");
    console.log(`   ID: ${retrievedSession.id}`);
    console.log(`   Amount: ${retrievedSession.amount_total ? retrievedSession.amount_total / 100 : 0} ${retrievedSession.currency?.toUpperCase()}`);
    console.log(`   Status: ${retrievedSession.status}\n`);

    // Summary
    console.log("═".repeat(60));
    console.log("🎉 All tests completed successfully!");
    console.log("═".repeat(60));
    console.log("\n✅ Stripe API is working correctly");
    console.log("✅ Checkout sessions can be created");
    console.log("✅ Sessions can be retrieved");
    console.log("\nNext steps:");
    console.log("  1. Start your Next.js app: pnpm dev");
    console.log("  2. Visit: http://localhost:3000/test-stripe");
    console.log("  3. Test with card: 4242 4242 4242 4242");
    console.log("  4. Any future date, any 3 digits CVC\n");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testStripeIntegration();
