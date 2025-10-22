/**
 * ============================================================================
 * SUCCESS PAGE
 * ============================================================================
 * 
 * Payment success confirmation page
 * Verifies payment and updates order status
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, ArrowRight, Package } from "lucide-react";
import { auth } from "@/auth";
import { getStripeService } from "@muzo/stripe";
import { serverEnv } from "@/lib/server-env";
import { findOrderByStripeSession, updateOrderStatus } from "@muzo/db/repositories/order";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { enqueueJob } from "@/lib/queue";
import { prepareFulfillmentJobPayload } from "@/lib/fulfillment-helper";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

async function SuccessContent({ searchParams }: Props) {
  const session = await auth();
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  if (!sessionId) {
    redirect("/dashboard?error=missing_session");
  }

  // Verify payment with Stripe
  const stripe = getStripeService({
    secretKey: serverEnv.STRIPE_SECRET_KEY,
  });

  const verification = await stripe.verifyPayment(sessionId);

  // Find order in database
  const order = await findOrderByStripeSession(sessionId);

  if (!order) {
    redirect("/dashboard?error=order_not_found");
  }

  // Update order status if paid
  if (verification.isPaid && order.status === "CREATED") {
    await updateOrderStatus(order.id, "PAID");
    
    // ✅ PHASE B: Trigger fulfillment job
    console.log('[success] Payment confirmed, triggering fulfillment for order:', order.id);
    
    try {
      const fulfillmentPayload = await prepareFulfillmentJobPayload(order.id);
      
      if (fulfillmentPayload) {
        console.log('[success] About to enqueue job with payload:', JSON.stringify(fulfillmentPayload, null, 2));
        
        await enqueueJob({
          type: "FULFILLMENT",
          payload: fulfillmentPayload,
          projectId: order.projectId,
        });
        
        console.log('[success] Fulfillment job enqueued successfully');
      } else {
        console.error('[success] Failed to prepare fulfillment payload');
      }
    } catch (error) {
      console.error('[success] Error enqueuing fulfillment job:', error);
      // Don't fail the success page if fulfillment fails to enqueue
      // The order is still paid and we can retry fulfillment later
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4 text-center">
          <Badge className="border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
            Paiement confirmé
          </Badge>
          <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
            Merci pour votre commande ! 🎉
          </h1>
          <p className="text-lg text-slate-400">
            Votre paiement de{" "}
            <span className="font-semibold text-slate-200">
              {((verification.amount || 0) / 100).toFixed(2)} {verification.currency?.toUpperCase()}
            </span>{" "}
            a été traité avec succès.
          </p>
        </div>

        {/* Order Details */}
        <Card className="border-slate-800 bg-slate-900/70">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-violet-400" />
              <CardTitle className="text-lg">Détails de la commande</CardTitle>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Numéro de commande</span>
                <span className="font-mono text-slate-200">{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email de confirmation</span>
                <span className="text-slate-200">{verification.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statut</span>
                <Badge className="border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
                  Payée
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="border-violet-500/40 bg-slate-900/40">
          <CardTitle className="text-base">Prochaines étapes</CardTitle>
          <CardDescription className="mt-3 space-y-2 text-sm">
            <p>
              ✅ Votre commande est en cours de traitement
            </p>
            <p>
              📧 Vous recevrez un email de confirmation avec le numéro de suivi
            </p>
            <p>
              🚚 Votre produit personnalisé sera expédié sous 3-5 jours ouvrés
            </p>
          </CardDescription>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href="/dashboard" className="gap-2">
            Voir mes commandes
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button href="/studio" variant="secondary">
            Nouvelle création
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="text-slate-400">Vérification du paiement...</p>
          </div>
        </main>
      }
    >
      <SuccessContent {...props} />
    </Suspense>
  );
}
