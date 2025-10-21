"use client";

import Image from "next/image";
import { Package, Truck, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/checkout-button";

type CheckoutSummaryProps = {
  projectId: string;
  projectTitle: string;
  productName: string;
  variantLabel: string;
  imageUrl: string;
  price: number;
  shipping: number;
  currency: string;
  productData?: {
    provider?: string;
    variantId?: string;
    quantity?: number;
  };
  disabled?: boolean;
};

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function CheckoutSummary({
  projectId,
  projectTitle,
  productName,
  variantLabel,
  imageUrl,
  price,
  shipping,
  currency,
  productData,
  disabled = false,
}: CheckoutSummaryProps) {
  const total = price + shipping;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Left: Order Summary */}
      <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
        <CardHeader>
          <CardTitle>Récapitulatif de votre commande</CardTitle>
          <CardDescription>Vérifiez les détails avant de procéder au paiement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Preview */}
          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-950/40">
              <Image
                src={imageUrl}
                alt={projectTitle}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{projectTitle}</h3>
                <p className="text-sm text-slate-400 mt-1">{productName}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="border-violet-500/40 bg-violet-500/10 text-violet-200">
                  {variantLabel}
                </Badge>
              </div>

              <div className="pt-2 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Package className="h-4 w-4" />
                  <span>Production sur-mesure</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Truck className="h-4 w-4" />
                  <span>Livraison standard (5-7 jours ouvrés)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Prix du produit</span>
              <span className="text-slate-100 font-medium">{formatPrice(price, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Frais de livraison</span>
              <span className="text-slate-100 font-medium">{formatPrice(shipping, currency)}</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-between">
              <span className="text-base font-semibold text-slate-100">Total</span>
              <span className="text-xl font-bold text-emerald-300">{formatPrice(total, currency)}</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-sky-300 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-sky-200">Paiement sécurisé par Stripe</p>
                <p className="text-slate-400">
                  Vos données bancaires sont protégées. La production démarre immédiatement après confirmation.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: Checkout Action */}
      <div className="space-y-6">
        <Card className="border-violet-500/40 bg-gradient-to-br from-slate-900/90 to-violet-900/20 shadow-xl sticky top-6">
          <CardHeader>
            <CardTitle>Finaliser la commande</CardTitle>
            <CardDescription>
              Cliquez ci-dessous pour procéder au paiement sécurisé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-950/60 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total à payer</span>
                <span className="text-lg font-bold text-slate-100">{formatPrice(total, currency)}</span>
              </div>
            </div>

            <CheckoutButton
              projectId={projectId}
              productName={productName}
              amount={Math.round(total * 100)} // Convert EUR to cents
              currency={currency}
              imageUrl={imageUrl}
              productData={productData}
              disabled={disabled}
            />

            <p className="text-xs text-slate-500 text-center">
              En cliquant sur &quot;Payer maintenant&quot;, vous acceptez nos conditions générales de vente.
            </p>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-base">Et après ?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">
                  1
                </span>
                <span>Confirmation de paiement par email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">
                  2
                </span>
                <span>Production de votre création (48h)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">
                  3
                </span>
                <span>Expédition et suivi de livraison</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">
                  4
                </span>
                <span>Réception chez vous (5-7 jours)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
