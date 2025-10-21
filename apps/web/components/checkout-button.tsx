/**
 * ============================================================================
 * CHECKOUT BUTTON COMPONENT
 * ============================================================================
 * 
 * Client component to initiate Stripe Checkout
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface CheckoutButtonProps {
  projectId: string;
  productName: string;
  productDescription?: string;
  amount: number; // in cents
  currency?: string;
  imageUrl?: string;
  productData?: Record<string, unknown>; // Product metadata
  disabled?: boolean;
}

export function CheckoutButton({
  projectId,
  productName,
  productDescription,
  amount,
  currency = "eur",
  imageUrl,
  productData,
  disabled = false,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      // Call checkout API
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          productName,
          productDescription,
          amount,
          currency,
          imageUrl,
          productData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la création de la session de paiement"
      );
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Chargement...
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          Commander ({(amount / 100).toFixed(2)} {currency.toUpperCase()})
        </>
      )}
    </Button>
  );
}
