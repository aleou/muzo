"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronDown, Loader2, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Orientation, ProductCategory, CatalogProduct } from "../types/catalog";

type Props = {
  orientation: Orientation;
  previewImageUrl?: string;
  projectTitle: string;
  onProductSelect: (product: { 
    productId: string; 
    variantId: string; 
    productName: string;
    productOptions?: Record<string, string>;
  }) => void;
  disabled?: boolean;
};

type SelectedVariant = {
  productId: string;
  options: Record<string, string>;
};

function cn(...classes: Array<string | boolean | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ProductSelector({
  orientation,
  previewImageUrl,
  projectTitle,
  onProductSelect,
  disabled = false,
}: Props) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SelectedVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCategoryDropdown]);

  // Fetch catalog on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/studio/catalog?orientation=${orientation}`);
        
        if (!response.ok) {
          throw new Error("Impossible de charger le catalogue");
        }

        const data = await response.json();
        setCategories(data.categories || []);
        
        // Auto-select first category
        if (data.categories && data.categories.length > 0) {
          setSelectedCategoryId(data.categories[0].id);
          // Charger les produits de la première catégorie
          loadCategoryProducts(data.categories[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [orientation]);

  // Load products when category is selected
  const loadCategoryProducts = useCallback(async (categoryId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/catalog?orientation=${orientation}&category=${categoryId}`);
      
      if (!response.ok) {
        throw new Error("Impossible de charger les produits");
      }

      const data = await response.json();
      const category = data.categories.find((cat: ProductCategory) => cat.id === categoryId);
      
      if (category) {
        setCategories(prev => 
          prev.map(cat => cat.id === categoryId ? category : cat)
        );
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, [orientation]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setShowCategoryDropdown(false);
    loadCategoryProducts(categoryId);
  }, [loadCategoryProducts]);

  const handleProductClick = useCallback(async (product: CatalogProduct) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
    
    // Charger les détails si le produit n'a pas d'options
    if (!product.options || product.options.length === 0) {
      setLoading(true);
      try {
        const response = await fetch(`/api/studio/catalog/${product.id}`);
        if (response.ok) {
          const details = await response.json();
          
          const updatedProduct = {
            ...product,
            options: details.options || [],
            specs: details.specs || [],
          };
          
          setSelectedProduct(updatedProduct);
          
          setCategories(prev =>
            prev.map(cat => ({
              ...cat,
              products: cat.products.map(p =>
                p.id === product.id ? updatedProduct : p
              ),
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const handleVariantChange = useCallback((optionType: string, value: string) => {
    if (!selectedProduct) return;

    setSelectedVariant(prev => {
      const newOptions = { ...(prev?.options || {}), [optionType]: value };
      return {
        productId: selectedProduct.id,
        options: newOptions,
      };
    });
  }, [selectedProduct]);

  const handleConfirmSelection = useCallback(() => {
    if (!selectedProduct || !selectedVariant) return;

    const variantId = Object.entries(selectedVariant.options)
      .map(([key, value]) => `${key}:${value}`)
      .join("|");

    onProductSelect({
      productId: selectedProduct.id,
      variantId,
      productName: selectedProduct.name,
      productOptions: selectedVariant.options, // Pass the options object
    });
  }, [selectedProduct, selectedVariant, onProductSelect]);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const currentProducts = selectedCategory?.products || [];

  if (loading && categories.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />
          <p className="mt-2 text-sm text-slate-400">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-950/10 p-6">
        <p className="text-center text-sm text-rose-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
      {/* Left: Product Selection */}
      <div className="space-y-4">
        {/* Category + Products combinés */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-5">
          {/* Category Selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Catégorie
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border-2 bg-slate-900 px-4 py-3 text-left transition-all",
                  showCategoryDropdown ? "border-violet-500" : "border-slate-700 hover:border-slate-600",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedCategory?.icon || "📦"}</span>
                  <span className="font-medium text-slate-100">
                    {selectedCategory?.name || "Sélectionner..."}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform",
                    showCategoryDropdown && "rotate-180"
                  )}
                />
              </button>

              {showCategoryDropdown && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition-colors last:border-b-0",
                        category.id === selectedCategoryId
                          ? "bg-violet-500/10"
                          : "hover:bg-slate-800"
                      )}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-100">{category.name}</p>
                        <p className="text-xs text-slate-500">{category.description}</p>
                      </div>
                      {category.id === selectedCategoryId && (
                        <Check className="h-4 w-4 text-violet-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          {selectedCategoryId && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200">
                  Produits
                </label>
                <span className="text-xs text-slate-500">
                  {currentProducts.length} disponible{currentProducts.length > 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                </div>
              ) : currentProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto h-10 w-10 text-slate-600" />
                  <p className="mt-2 text-sm text-slate-400">Aucun produit disponible</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductClick(product)}
                      disabled={disabled}
                      className={cn(
                        "rounded-lg border-2 p-4 text-left transition-all",
                        selectedProduct?.id === product.id
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-slate-700 bg-slate-900/50 hover:border-slate-600",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-100">{product.name}</h4>
                          {product.fromPrice && (
                            <p className="mt-1 text-sm font-medium text-violet-300">
                              {product.fromPrice} {product.currency}
                            </p>
                          )}
                        </div>
                        {selectedProduct?.id === product.id && (
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-500">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Variant Options */}
        {selectedProduct && selectedProduct.options && selectedProduct.options.length > 0 && (
          <div className="rounded-lg border border-violet-500/30 bg-gradient-to-br from-slate-900/90 to-violet-900/10 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">
              Options du produit
            </h3>
            <div className="space-y-4">
              {selectedProduct.options.map((option) => (
                <div key={option.reference}>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    {option.type}
                  </label>
                  <select
                    value={selectedVariant?.options[option.type] || ""}
                    onChange={(e) => handleVariantChange(option.type, e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Sélectionner...</option>
                    <option value={option.reference}>{option.reference}</option>
                  </select>
                </div>
              ))}

              <Button
                onClick={handleConfirmSelection}
                disabled={
                  disabled ||
                  !selectedVariant ||
                  Object.keys(selectedVariant.options).length !== selectedProduct.options.length
                }
                className="w-full gap-2"
              >
                <Check className="h-4 w-4" />
                Valider ce produit
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Preview */}
      <div className="sticky top-4 h-fit">
        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
          {/* Image plein écran */}
          <div className="relative aspect-[3/4] bg-slate-950/40">
            {previewImageUrl ? (
              <Image
                src={previewImageUrl}
                alt={`Aperçu de ${projectTitle}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-slate-600" />
              </div>
            )}
          </div>

          {/* Détails */}
          {selectedProduct ? (
            <div className="space-y-4 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {selectedProduct.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{projectTitle}</p>
              </div>

              {selectedProduct.fromPrice && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-violet-300">
                    {selectedProduct.fromPrice}
                  </span>
                  <span className="text-sm text-slate-400">{selectedProduct.currency}</span>
                </div>
              )}

              {selectedProduct.note && (
                <p className="text-sm text-slate-300">{selectedProduct.note}</p>
              )}

              {selectedVariant && Object.keys(selectedVariant.options).length > 0 && (
                <div className="space-y-2 rounded-lg bg-slate-800/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Configuration
                  </p>
                  {Object.entries(selectedVariant.options).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-400">{key}</span>
                      <span className="font-medium text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-400">
                Sélectionnez un produit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
