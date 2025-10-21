"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProductVariant = {
  id: string;
  label: string;
  sizeHint?: string;
  pieces?: number;
  dpiRequirement: number;
  price?: number;
  shipping?: number;
  currency?: string;
};

type Product = {
  provider: string;
  productId: string;
  name: string;
  kind: "puzzle" | "poster" | "canvas" | "other";
  description?: string;
  variants: ProductVariant[];
};

type ProductCardEnhancedProps = {
  product: Product;
  isSelected: boolean;
  selectedVariantId: string;
  onSelectProduct: () => void;
  onSelectVariant: (variantId: string) => void;
  disabled?: boolean;
};

function formatPrice(amount: number | undefined, currency: string | undefined) {
  if (amount === undefined || currency === undefined) {
    return null;
  }

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

export function ProductCardEnhanced({
  product,
  isSelected,
  selectedVariantId,
  onSelectProduct,
  onSelectVariant,
  disabled = false,
}: ProductCardEnhancedProps) {
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const hasPrice = selectedVariant?.price !== undefined;

  return (
    <div className="space-y-4">
      <button
        type="button"
        className={cn(
          "w-full flex flex-col gap-3 rounded-lg border p-4 text-left transition",
          isSelected
            ? "border-violet-400 bg-violet-500/10 ring-2 ring-violet-400/20"
            : "border-slate-700 bg-slate-900/60 hover:border-slate-500",
          disabled && !isSelected && "opacity-60 cursor-not-allowed",
        )}
        disabled={disabled}
        onClick={onSelectProduct}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-slate-50">{product.name}</p>
            {product.description && (
              <p className="text-xs text-slate-400">{product.description}</p>
            )}
          </div>
          <Badge className="uppercase tracking-wide shrink-0">{product.kind}</Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {product.provider}
          </span>
          <span>•</span>
          <span>{product.variants.length} variante{product.variants.length > 1 ? "s" : ""}</span>
        </div>
      </button>

      {isSelected && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <label htmlFor={`variant-${product.productId}`} className="text-sm font-medium text-slate-300">
            Choisissez une variante
          </label>

          <div className="grid gap-2">
            {product.variants.map((variant) => {
              const isVariantSelected = variant.id === selectedVariantId;
              const variantHasPrice = variant.price !== undefined;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onSelectVariant(variant.id)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-md border p-3 text-left transition",
                    isVariantSelected
                      ? "border-violet-400 bg-violet-500/10"
                      : "border-slate-700 bg-slate-900/40 hover:border-slate-600",
                    disabled && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-100">
                        {variant.label}
                      </span>
                      {variant.pieces && (
                        <Badge className="text-xs border-slate-600 bg-slate-800/50">
                          {variant.pieces} pièces
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {variant.sizeHint && <span>{variant.sizeHint}</span>}
                      <span>•</span>
                      <span>{variant.dpiRequirement} DPI min.</span>
                    </div>
                  </div>

                  {variantHasPrice && (
                    <div className="text-right space-y-0.5">
                      <p className="text-base font-semibold text-slate-100">
                        {formatPrice(variant.price, variant.currency)}
                      </p>
                      {variant.shipping !== undefined && variant.shipping > 0 && (
                        <p className="text-xs text-slate-500">
                          + {formatPrice(variant.shipping, variant.currency)} livraison
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {hasPrice && selectedVariant && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">Total estimé</span>
                <span className="text-lg font-bold text-emerald-300">
                  {formatPrice(
                    (selectedVariant.price ?? 0) + (selectedVariant.shipping ?? 0),
                    selectedVariant.currency
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Prix incluant la production et la livraison standard vers la France
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
