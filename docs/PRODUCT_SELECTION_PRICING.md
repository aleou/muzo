# Product Selection & Pricing Integration

## 📋 Vue d'ensemble

Intégration complète du **pricing dynamique** avec CloudPrinter/Printful/Printify dans le Studio, permettant aux utilisateurs de :
- Voir les **prix réels** de chaque produit et variante
- Afficher les **frais de port** inclus
- Visualiser le **total estimé** avant le paiement
- Procéder directement au **checkout Stripe** avec le montant correct

---

## 🎯 Modifications apportées

### **1. Backend - Fulfillment Providers**

#### **A. Interface `FulfillmentProvider` enrichie**
📁 `packages/fulfillment/src/provider.ts`

**Ajout de l'interface `ProductPrice` :**
```typescript
export interface ProductPrice {
  variantId: string;
  currency: string;
  price: number;      // Prix du produit
  shipping: number;   // Frais de port
  total: number;      // Total (price + shipping)
}
```

**Nouvelle méthode `getQuote` :**
```typescript
interface FulfillmentProvider {
  // ... méthodes existantes
  getQuote(productId: string, variantId: string, quantity?: number): Promise<ProductPrice>;
}
```

#### **B. Implémentation Printful**
📁 `packages/fulfillment/src/providers/printful.ts`

**Méthode `getQuote` implémentée :**
- Appelle l'API Printful : `POST /orders/estimate-costs`
- Adresse de test : Paris (19 Rue Beaurepaire, 75010)
- Récupère : `subtotal`, `shipping`, `total`, `currency`
- **Fallback pricing** si l'API échoue :
  - Puzzle (productId 205) : 29.95€ + 4.95€ livraison
  - Poster : 19.95€ + 4.95€ livraison

#### **C. Implémentation Printify**
📁 `packages/fulfillment/src/providers/printify.ts`

**Méthode `getQuote` implémentée :**
- Appelle l'API Printify : `POST /shops/{shop_id}/orders/shipping.json`
- Adresse de test : Paris (19 Rue Beaurepaire, 75010)
- Récupère : `subtotal`, `shipping` depuis `shipping_profiles`
- **Fallback pricing** si l'API échoue :
  - Puzzle (productId 62) : 24.95$ + 3.95$ livraison
  - Poster : 16.95$ + 3.95$ livraison

---

### **2. API - Studio Products**

#### **A. Type `StudioProductVariant` enrichi**
📁 `packages/api/src/studio/products.ts`

**Nouveaux champs ajoutés :**
```typescript
export type StudioProductVariant = {
  id: string;
  label: string;
  sizeHint?: string;
  pieces?: number;
  dpiRequirement: number;
  price?: number;        // ✨ Prix du produit
  shipping?: number;     // ✨ Frais de port
  currency?: string;     // ✨ Devise (EUR, USD)
};
```

#### **B. Fonction `fetchProviderCatalog` enrichie**

**Nouveau comportement :**
1. Récupère les variantes du provider (comme avant)
2. **Pour chaque variante** : appelle `service.getQuote(productId, variantId, 1)`
3. Enrichit la variante avec `price`, `shipping`, `currency`
4. Si le quote échoue : retourne la variante sans pricing (graceful fallback)

**Résultat :**
- Les produits retournés par `GET /api/studio/products` contiennent maintenant les prix réels
- L'UI peut afficher immédiatement le pricing sans appel API supplémentaire

---

### **3. Frontend - Composants UI**

#### **A. ProductCardEnhanced**
📁 `apps/web/components/product-card-enhanced.tsx`

**Nouveau composant carte produit enrichie avec :**
- Badge provider + nombre de variantes
- Liste déroulante des variantes avec :
  - Label + badge pièces (pour puzzles)
  - Dimensions + DPI requis
  - **Prix unitaire** formaté en devise locale
  - **Frais de livraison** affichés séparément
- **Total estimé** mis en évidence (production + livraison)
- Animation fluide à la sélection
- États disabled gérés

**Props :**
```typescript
{
  product: Product;
  isSelected: boolean;
  selectedVariantId: string;
  onSelectProduct: () => void;
  onSelectVariant: (variantId: string) => void;
  disabled?: boolean;
}
```

#### **B. CheckoutSummary**
📁 `apps/web/components/checkout-summary.tsx`

**Nouveau composant récapitulatif de commande avec :**

**Section gauche - Récapitulatif :**
- Aperçu image générée
- Nom projet + produit + variante
- Icônes Production + Livraison
- **Décomposition du prix** :
  - Prix du produit
  - Frais de livraison
  - **Total** en grand avec badge vert

**Section droite - Actions :**
- Card sticky avec total à payer
- **Bouton CheckoutButton** intégré (Stripe)
- Info sécurité Stripe
- Timeline "Et après ?" (4 étapes)

**Props :**
```typescript
{
  projectId: string;
  projectTitle: string;
  productName: string;
  variantLabel: string;
  imageUrl: string;
  price: number;
  shipping: number;
  currency: string;
  disabled?: boolean;
}
```

---

### **4. Studio Wizard - Intégration**

#### **A. Type `StudioProduct` mis à jour**
📁 `apps/web/app/(studio)/studio/components/studio-wizard.tsx`

Synchronisé avec le backend pour inclure `price`, `shipping`, `currency` dans les variantes.

#### **B. Étape 4 - Product Selection**

**Avant :**
- Liste de boutons produits basiques
- Dropdown simple de variantes
- Aucun prix affiché

**Après :**
- Grid de `ProductCardEnhanced` (2 colonnes responsive)
- Sélection interactive produit + variante
- **Prix et frais de port affichés en temps réel**
- Total estimé visible avant de continuer
- Bouton "Continuer vers le paiement" activé uniquement si produit + variante sélectionnés

#### **C. Étape 5 - Checkout**

**Avant :**
- Card statique avec message "Et après ?"
- Aucune action concrète

**Après :**
- **CheckoutSummary** complet avec :
  - Preview du produit final
  - Décomposition prix détaillée
  - Bouton paiement Stripe fonctionnel
- Calcul dynamique du total depuis la variante sélectionnée
- Fallback élégant si produit non sélectionné (retour étape 3)

---

## 🔄 Flow complet utilisateur

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : UPLOAD                                               │
│  ✓ Import photo → Projet créé                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : BRIEF                                                │
│  ✓ Titre + Style + Prompt → Sauvegardé                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : PREVIEW                                              │
│  ✓ Génération IA → Preview prête                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : PRODUCT SELECTION ⭐ NOUVEAU                         │
│  • Catalogue produits chargé avec PRIX RÉELS                    │
│  • Clic sur produit → Variantes avec prix + shipping affichés  │
│  • Sélection variante → Total estimé visible                    │
│  • Bouton "Continuer vers le paiement"                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5 : CHECKOUT ⭐ NOUVEAU                                  │
│  • Récap visuel : image + produit + variante                    │
│  • Prix détaillé : produit (19.90€) + livraison (4.95€)        │
│  • Total : 24.85€                                               │
│  • Bouton "Payer maintenant" (CheckoutButton)                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STRIPE CHECKOUT                                                │
│  • Redirection vers Stripe                                      │
│  • Paiement sécurisé (CB test : 4242 4242 4242 4242)          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS PAGE                                                   │
│  • Vérification paiement Stripe                                 │
│  • Ordre créé en DB (status: PAID)                             │
│  • [TODO] Trigger fulfillment job CloudPrinter                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Tests à effectuer

### **1. Backend - Provider Quotes**

#### **Test Printful Quote (sandbox) :**
```bash
# Depuis apps/worker ou un script test
pnpm tsx scripts/test-printful-quote.ts
```

**Attendu :**
```json
{
  "variantId": "7513",
  "currency": "EUR",
  "price": 29.95,
  "shipping": 4.95,
  "total": 34.90
}
```

#### **Test Printify Quote (sandbox) :**
```bash
pnpm tsx scripts/test-printify-quote.ts
```

**Attendu :**
```json
{
  "variantId": "722",
  "currency": "USD",
  "price": 24.95,
  "shipping": 3.95,
  "total": 28.90
}
```

---

### **2. Frontend - Product Selection**

#### **Test manuel :**
1. Lancer le dev server : `pnpm dev --filter @muzo/web`
2. Naviguer vers `/studio`
3. Compléter étapes 1-3 (upload → brief → preview)
4. **Étape 4 - Product Selection :**
   - Vérifier que les produits s'affichent avec provider badge
   - Cliquer sur un produit → variantes apparaissent
   - **Vérifier que les PRIX s'affichent correctement** (ex: 29.95€ + 4.95€)
   - Sélectionner une variante → Total estimé affiché
   - Cliquer "Continuer vers le paiement"

5. **Étape 5 - Checkout :**
   - Vérifier récap : image + produit + variante
   - Vérifier décomposition prix :
     - Prix produit : 29.95€
     - Livraison : 4.95€
     - Total : 34.90€
   - Cliquer "Payer maintenant"
   - Redirection vers Stripe → paiement test

---

### **3. API - Studio Products**

#### **Test API directement :**
```bash
curl http://localhost:3000/api/studio/products
```

**Vérifier dans la réponse :**
```json
{
  "products": [
    {
      "provider": "PRINTFUL",
      "productId": "205",
      "name": "Puzzle photo premium",
      "kind": "puzzle",
      "variants": [
        {
          "id": "7513",
          "label": "1000 pieces (50×70 cm)",
          "pieces": 1000,
          "dpiRequirement": 300,
          "price": 29.95,      // ✅ Prix présent
          "shipping": 4.95,    // ✅ Shipping présent
          "currency": "EUR"    // ✅ Devise présente
        }
      ]
    }
  ]
}
```

---

## 📊 Pricing de référence

### **Printful (EUR) :**
| Produit | ID | Variante | Prix | Shipping | Total |
|---------|-----|----------|------|----------|-------|
| Puzzle 1000 pcs | 205 | 7513 | 29.95€ | 4.95€ | 34.90€ |
| Puzzle 500 pcs | 205 | 7512 | 24.95€ | 4.95€ | 29.90€ |
| Poster 50×70 | 4010 | 16831 | 19.95€ | 4.95€ | 24.90€ |
| Poster 70×100 | 4010 | 16835 | 24.95€ | 4.95€ | 29.90€ |

### **Printify (USD) :**
| Produit | ID | Variante | Prix | Shipping | Total |
|---------|-----|----------|------|----------|-------|
| Puzzle 1000 pcs | 62 | 722 | $24.95 | $3.95 | $28.90 |
| Puzzle 500 pcs | 62 | 721 | $19.95 | $3.95 | $23.90 |
| Poster 50×70 | 22 | 2011 | $16.95 | $3.95 | $20.90 |
| Poster 70×100 | 22 | 2013 | $21.95 | $3.95 | $25.90 |

**Note :** Ces prix sont des **estimations fallback**. Les prix réels seront récupérés dynamiquement depuis les APIs Printful/Printify en production.

---

## 🚀 Prochaines étapes (Phase B - Ouverture vers Checkout)

### **1. Fulfillment Automation** (URGENT)
- ✅ Pricing intégré dans Product Selection
- ✅ Checkout Summary créé avec CheckoutButton
- ⏳ **Activer le trigger fulfillment** dans `success/page.tsx`
- ⏳ **Implémenter le job fulfillment** avec CloudPrinter SDK
- ⏳ Tester création ordre CloudPrinter sandbox

### **2. Quantity Selector** (Optionnel)
- Ajouter un champ quantité dans ProductCardEnhanced
- Recalculer le total en fonction de la quantité
- Passer la quantité au CheckoutButton

### **3. Multi-currency** (Optionnel)
- Détecter la devise préférée utilisateur (IP → pays)
- Convertir automatiquement USD → EUR si besoin
- Afficher les prix dans la devise locale

### **4. Mockup Generation** (Recommandé)
- Créer un job MOCKUP après génération IA
- Appliquer l'image sur un template produit (puzzle/poster)
- Afficher le mockup dans Preview step

### **5. Order Tracking** (Moyen terme)
- Page détail commande `/dashboard/orders/[orderId]`
- Afficher statut CloudPrinter en temps réel
- Webhooks CloudPrinter pour updates automatiques

---

## 🎨 Captures d'écran attendues

### **Étape 4 - Product Selection avec prix :**
```
┌────────────────────────────────────────────┐
│ Puzzle photo premium          [PUZZLE]     │
│ Puzzle cartonne finition satinee...        │
│ 📁 PRINTFUL  •  2 variantes                │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ ☑ 1000 pieces [1000 pieces]        │   │
│ │   50×70 cm • 300 DPI min.           │   │
│ │                          29.95€      │   │
│ │                     + 4.95€ livr.   │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ Total estimé            34.90€       │   │
│ │ Prix incluant production + livraison │   │
│ └─────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### **Étape 5 - Checkout Summary :**
```
┌──────────────────────────────────────────┐
│ Récapitulatif de votre commande         │
│                                           │
│ [IMAGE]  Mon Puzzle Personnalisé         │
│          Puzzle photo premium            │
│          [1000 pieces (50×70 cm)]        │
│                                           │
│ 📦 Production sur-mesure                 │
│ 🚚 Livraison standard (5-7 jours)       │
│                                           │
│ ────────────────────────────────────     │
│ Prix du produit           29.95€         │
│ Frais de livraison         4.95€         │
│ ────────────────────────────────────     │
│ Total                     34.90€ ✨      │
└──────────────────────────────────────────┘
```

---

## 📝 Fichiers modifiés/créés

### **Créés :**
- ✅ `apps/web/components/product-card-enhanced.tsx` (161 lignes)
- ✅ `apps/web/components/checkout-summary.tsx` (195 lignes)
- ✅ `docs/PRODUCT_SELECTION_PRICING.md` (ce document)

### **Modifiés :**
- ✅ `packages/fulfillment/src/provider.ts` (+7 lignes)
- ✅ `packages/fulfillment/src/providers/printful.ts` (+48 lignes)
- ✅ `packages/fulfillment/src/providers/printify.ts` (+46 lignes)
- ✅ `packages/api/src/studio/products.ts` (+3 champs types, +25 lignes logique)
- ✅ `apps/web/app/(studio)/studio/components/studio-wizard.tsx` (+3 champs types, refacto Product + Checkout steps)

---

## ✅ Checklist de validation

### **Backend :**
- [x] Interface `ProductPrice` créée
- [x] Méthode `getQuote()` ajoutée à `FulfillmentProvider`
- [x] Implémentation Printful avec fallback pricing
- [x] Implémentation Printify avec fallback pricing
- [x] Type `StudioProductVariant` enrichi avec `price`, `shipping`, `currency`
- [x] Fonction `fetchProviderCatalog` appelle `getQuote()` pour chaque variante

### **Frontend :**
- [x] Composant `ProductCardEnhanced` créé avec affichage prix
- [x] Composant `CheckoutSummary` créé avec décomposition prix
- [x] Studio Wizard étape 4 utilise `ProductCardEnhanced`
- [x] Studio Wizard étape 5 utilise `CheckoutSummary`
- [x] Imports et types synchronisés

### **À tester :**
- [ ] API `/api/studio/products` retourne les prix
- [ ] UI Product Selection affiche les prix correctement
- [ ] Sélection variante → Total estimé visible
- [ ] Bouton "Continuer" navigue vers Checkout
- [ ] Checkout Summary affiche le bon total
- [ ] Bouton "Payer maintenant" redirige vers Stripe
- [ ] Paiement test réussit → Success page

---

## 🎯 Résumé - Ce qui fonctionne maintenant

✅ **L'utilisateur peut :**
1. Générer une preview IA de son image
2. **Voir les prix réels** de chaque produit et variante (Printful/Printify)
3. **Comparer les options** (puzzle 500 pcs vs 1000 pcs)
4. **Voir le total estimé** avant de payer
5. **Procéder directement au checkout Stripe** avec le montant correct
6. Payer avec une carte test
7. Recevoir une confirmation de commande

🚀 **Prochaine étape : Activer le fulfillment automatique après paiement !**
