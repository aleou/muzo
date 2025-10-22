"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronDown, Loader2, Package, Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Orientation, ProductCategory, CatalogProduct, ProductOption } from "../types/catalog";

type Props = {
  orientation: Orientation;
  previewImageUrl?: string;
  projectTitle: string;
  onProductSelect: (product: { productId: string; variantId: string; productName: string }) => void;
  disabled?: boolean;
};

type SelectedVariant = {
  productId: string;
  options: Record<string, string>;
  price?: number;
  currency?: string;
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
        
        // Auto-select first category with products
        const firstWithProducts = data.categories.find((cat: ProductCategory) => cat.productCount > 0);
        if (firstWithProducts) {
          setSelectedCategoryId(firstWithProducts.id);
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
    
    // Load products for this category
    const category = categories.find(cat => cat.id === categoryId);
    if (category && category.products.length === 0) {
      loadCategoryProducts(categoryId);
    }
  }, [categories, loadCategoryProducts]);

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
          
          // Mettre à jour le produit avec les détails
          const updatedProduct = {
            ...product,
            options: details.options || [],
            specs: details.specs || [],
          };
          
          setSelectedProduct(updatedProduct);
          
          // Mettre à jour aussi dans la liste des catégories
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

    // Build variant ID from options
    const variantId = Object.entries(selectedVariant.options)
      .map(([key, value]) => `${key}:${value}`)
      .join("|");

    onProductSelect({
      productId: selectedProduct.id,
      variantId,
      productName: selectedProduct.name,
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
      <Card className="border-rose-500/20 bg-rose-950/10">
        <CardContent className="py-6">
          <p className="text-center text-sm text-rose-200">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      {/* Left: Product Selection */}
      <div className="space-y-4">
        {/* Category Selector - Compact */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Catégorie de produit
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              disabled={disabled}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border-2 border-slate-700 bg-slate-900 p-3 text-left transition-all",
                showCategoryDropdown && "border-violet-500",
                !disabled && "hover:border-slate-600",
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
                  "h-5 w-5 text-slate-400 transition-transform",
                  showCategoryDropdown && "rotate-180"
                )}
              />
            </button>

              {showCategoryDropdown && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-slate-800 p-3 text-left transition-colors last:border-b-0",
                        category.id === selectedCategoryId
                          ? "bg-violet-500/10"
                          : "hover:bg-slate-800"
                      )}
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-100">{category.name}</p>
                          {category.productCount > 0 && (
                            <Badge className="text-xs">
                              {category.productCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{category.description}</p>
                      </div>
                      {category.id === selectedCategoryId && (
                        <Check className="h-5 w-5 text-violet-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {selectedCategoryId && (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-base">Produits disponibles</CardTitle>
              <CardDescription className="text-xs">
                {currentProducts.length > 0
                  ? `${currentProducts.length} produit${currentProducts.length > 1 ? "s" : ""} trouvé${currentProducts.length > 1 ? "s" : ""}`
                  : "Aucun produit disponible dans cette catégorie"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                </div>
              ) : currentProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-400">
                    Aucun produit disponible
                  </p>
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
                        "group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all",
                        selectedProduct?.id === product.id
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-slate-700 bg-slate-900/50 hover:border-slate-600",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-100">{product.name}</h4>
                          {product.note && (
                            <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                              {product.note}
                            </p>
                          )}
                          {product.fromPrice && (
                            <p className="mt-2 text-sm font-medium text-violet-300">
                              À partir de {product.fromPrice} {product.currency}
                            </p>
                          )}
                        </div>
                        {selectedProduct?.id === product.id && (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-500">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {product.specs && product.specs.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {product.specs.slice(0, 3).map((spec, idx) => (
                            <Badge
                              key={idx}
                              className="border-slate-600 text-xs"
                            >
                              {spec.value}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div
                        className={cn(
                          "absolute inset-0 border-2 border-violet-500 opacity-0 transition-opacity",
                          selectedProduct?.id === product.id && "opacity-100"
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Variant Options */}
        {selectedProduct && selectedProduct.options && selectedProduct.options.length > 0 && (
          <Card className="border-violet-500/30 bg-gradient-to-br from-slate-900/90 to-violet-900/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <CardTitle className="text-base">Options de personnalisation</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configurez votre {selectedProduct.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProduct.options.map((option) => (
                <div key={option.reference}>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    {option.type}
                    {option.note && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        ({option.note})
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedVariant?.options[option.type] || ""}
                    onChange={(e) => handleVariantChange(option.type, e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                Confirmer la sélection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Preview */}
      <div className="space-y-4">
        <Card className="sticky top-4 border-slate-800 bg-slate-900/70">
          <CardContent className="p-0">
            {/* Image plein écran */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg border-b border-slate-700 bg-slate-950/40">
              {previewImageUrl ? (
                <Image
                  src={previewImageUrl}
                  alt={`Aperçu de ${projectTitle}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <Package className="mx-auto h-12 w-12 text-slate-600" />
                    <p className="mt-3 text-sm text-slate-400">
                      Aperçu du mockup à venir
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Détails du produit */}
            {selectedProduct && (
              <div className="space-y-4 p-6">
                {/* En-tête produit */}
                <div className="border-b border-slate-700 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {selectedProduct.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">{projectTitle}</p>
                    </div>
                    {selectedProduct.fromPrice && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-violet-300">
                          {selectedProduct.fromPrice} {selectedProduct.currency}
                        </p>
                        <p className="text-xs text-slate-500">À partir de</p>
                      </div>
                    )}
                  </div>
                  {selectedProduct.note && (
                    <p className="mt-3 text-sm text-slate-300">
                      {selectedProduct.note}
                    </p>
                  )}
                </div>

                {/* Spécifications techniques */}
                {selectedProduct.specs && selectedProduct.specs.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
                      Caractéristiques
                    </h4>
                    <div className="grid gap-2">
                      {selectedProduct.specs.map((spec, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3"
                        >
                          <Check className="h-4 w-4 flex-shrink-0 text-violet-400" />
                          <div className="flex-1">
                            <p className="text-sm text-slate-200">{spec.value}</p>
                            {spec.note && (
                              <p className="mt-0.5 text-xs text-slate-500">{spec.note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Configuration sélectionnée */}
                {selectedVariant && Object.keys(selectedVariant.options).length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
                      Votre configuration
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(selectedVariant.options).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                        >
                          <span className="text-sm text-slate-400">{key}</span>
                          <span className="font-medium text-slate-200">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Garanties */}
                <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4">
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span>Production de haute qualité</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span>Livraison incluse dans le prix</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span>Satisfaction garantie</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder si aucun produit sélectionné */}
            {!selectedProduct && (
              <div className="p-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 text-sm text-slate-400">
                  Sélectionnez un produit pour voir les détails
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
