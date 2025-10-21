/**
 * ============================================================================
 * STRIPE TEST PAGE
 * ============================================================================
 * 
 * Test page for Stripe integration
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/checkout-button";

export default async function StripeTestPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <Badge className="border-violet-500/60 bg-violet-500/10 text-violet-200">
            Test Stripe
          </Badge>
          <h1 className="mt-4 text-3xl font-bold text-slate-100">
            Test d&apos;intégration Stripe
          </h1>
          <p className="mt-2 text-slate-400">
            Testez le processus de paiement avec une commande factice
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/70">
          <div className="space-y-6">
            <div>
              <CardTitle>Produit de test</CardTitle>
              <CardDescription className="mt-2">
                Puzzle Personnalisé 1000 pièces
              </CardDescription>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-100">19,90 €</span>
              <span className="text-sm text-slate-400">TTC</span>
            </div>

            <div className="space-y-2 text-sm text-slate-300">
              <p>✅ Création IA 300 DPI incluse</p>
              <p>✅ Livraison suivie</p>
              <p>✅ Support client 7j/7</p>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <CheckoutButton
                projectId="test-project-123"
                productName="Puzzle Personnalisé 1000 pièces"
                productDescription="Puzzle avec votre création IA - Format 70x50cm"
                amount={1990} // 19.90 EUR in cents
                currency="eur"
                imageUrl="https://images.unsplash.com/photo-1611262588024-d12430b98920?w=400"
              />
            </div>

            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-semibold">💳 Cartes de test Stripe :</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Succès : <code className="rounded bg-slate-900 px-1">4242 4242 4242 4242</code></li>
                <li>• Échec : <code className="rounded bg-slate-900 px-1">4000 0000 0000 0002</code></li>
                <li>• Date : n&apos;importe quelle date future</li>
                <li>• CVC : n&apos;importe quel 3 chiffres</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
