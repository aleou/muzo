/**
 * ============================================================================
 * CHECKOUT API ROUTE
 * ============================================================================
 * 
 * Create Stripe Checkout Session
 * POST /api/checkout
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getStripeService } from "@muzo/stripe";
import { serverEnv } from "@/lib/server-env";
import { createOrder } from "@muzo/db/repositories/order";
import { prisma } from "@muzo/db";

const CheckoutRequestSchema = z.object({
  projectId: z.string(),
  productName: z.string(),
  productDescription: z.string().optional(),
  amount: z.number().positive(), // in cents
  currency: z.string().default("eur"),
  imageUrl: z.string().url().optional(),
  productData: z.record(z.unknown()).optional(), // Product metadata (CloudPrinter ref, etc.)
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();
    const data = CheckoutRequestSchema.parse(body);

    // Extract provider from productData
    const provider = (data.productData?.provider as string)?.toUpperCase() || "CLOUDPRINTER";
    const validProvider = ["PRINTFUL", "PRINTIFY", "CLOUDPRINTER"].includes(provider) 
      ? provider as "PRINTFUL" | "PRINTIFY" | "CLOUDPRINTER"
      : "CLOUDPRINTER";

    // 3. Create order in database (status: CREATED)
    const order = await createOrder({
      user: {
        connect: { id: session.user.id },
      },
      project: {
        connect: { id: data.projectId },
      },
      provider: validProvider,
      product: (data.productData as any) || {},
      price: data.amount / 100, // Convert cents to EUR
      currency: data.currency,
      stripeSessionId: "", // Will be updated after Stripe session creation
      status: "CREATED",
    });

    // 4. Create Stripe Checkout Session
    const stripe = getStripeService({
      secretKey: serverEnv.STRIPE_SECRET_KEY,
    });

    const checkoutSession = await stripe.createCheckoutSession({
      userId: session.user.id,
      projectId: data.projectId,
      orderId: order.id,
      productName: data.productName,
      productDescription: data.productDescription || `Produit personnalisé MUZO`,
      amount: data.amount,
      currency: data.currency,
      imageUrl: data.imageUrl,
      successUrl: `${serverEnv.NEXTAUTH_URL}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${serverEnv.NEXTAUTH_URL}/dashboard?canceled=true`,
    });

    // 5. Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    // 6. Return session details
    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      orderId: order.id,
    });
  } catch (error) {
    console.error("[Checkout] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
