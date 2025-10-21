feat(studio): integrate dynamic pricing in product selection and checkout

PHASE A: Product Selection Enrichment with Real-Time Pricing

## Backend Changes

### Fulfillment Providers
- Add `ProductPrice` interface with variantId, currency, price, shipping, total
- Add `getQuote()` method to `FulfillmentProvider` interface
- Implement Printful quote API (POST /orders/estimate-costs)
  * Uses test address: Paris 75010
  * Fallback pricing: 29.95€ puzzle / 19.95€ poster + 4.95€ shipping
- Implement Printify quote API (POST /shops/{id}/orders/shipping.json)
  * Uses test address: Paris 75010
  * Fallback pricing: 24.95$ puzzle / 16.95$ poster + 3.95$ shipping

### Studio Products API
- Enrich `StudioProductVariant` type with optional price, shipping, currency fields
- Update `fetchProviderCatalog()` to call `getQuote()` for each variant
- API endpoint `/api/studio/products` now returns pricing data

## Frontend Changes

### New Components
- **ProductCardEnhanced** (161 lines)
  * Interactive product card with provider badge
  * Expandable variant selector with pricing
  * Shows unit price + shipping separately
  * Displays estimated total in highlighted card
  * Smooth animations and disabled states

- **CheckoutSummary** (195 lines)
  * Two-column layout (summary + actions)
  * Image preview with product details
  * Price breakdown (product + shipping = total)
  * Integrated CheckoutButton for Stripe
  * Stripe security info box
  * "What happens next" timeline (4 steps)

### Studio Wizard Updates
- Update `StudioProduct` type to include pricing fields
- Replace basic product selection (step 4) with `ProductCardEnhanced`
  * Grid layout (2 columns responsive)
  * Real-time pricing display
  * "Continue to payment" button enabled only when selection complete
- Replace static checkout placeholder (step 5) with `CheckoutSummary`
  * Dynamic total calculation from selected variant
  * Functional Stripe checkout button
  * Graceful fallback if product not selected

## Documentation

- Add `docs/PRODUCT_SELECTION_PRICING.md` (400+ lines)
  * Technical documentation of all changes
  * Complete user flow diagram
  * Test procedures and expected results
  * Reference pricing tables (Printful/Printify)
  * Validation checklist

- Add `docs/PHASE_A_SUMMARY.md`
  * Executive summary of Phase A completion
  * Before/after comparison
  * Testing instructions
  * Next steps (Phase B)

- Add `scripts/test-printful-quote.ts`
  * Test script to verify Printful pricing API
  * Tests multiple products (puzzles, posters)
  * Shows fallback behavior on API errors

## User Experience

### Before
- Product selection: basic buttons with no pricing
- Checkout: static placeholder with no action

### After
- Product selection: rich cards with real-time pricing
  * Unit price displayed (e.g., 29.95€)
  * Shipping cost shown separately (+ 4.95€)
  * Estimated total highlighted (34.90€)
- Checkout: complete summary with Stripe integration
  * Visual product recap with image
  * Price breakdown (product + shipping)
  * Functional "Pay now" button

## Testing

Dev server tested and confirmed working:
```bash
pnpm dev --filter @muzo/web
# ✅ Server starts successfully on http://localhost:3000
```

Manual testing required:
1. Navigate to /studio
2. Complete steps 1-3 (upload → brief → preview)
3. Step 4: Verify pricing displays correctly
4. Step 5: Verify checkout summary and Stripe button
5. Complete test payment (card: 4242 4242 4242 4242)

## Files Changed

**Created:**
- apps/web/components/product-card-enhanced.tsx (161 lines)
- apps/web/components/checkout-summary.tsx (195 lines)
- docs/PRODUCT_SELECTION_PRICING.md (400+ lines)
- docs/PHASE_A_SUMMARY.md (300+ lines)
- scripts/test-printful-quote.ts (70 lines)

**Modified:**
- packages/fulfillment/src/provider.ts (+7 lines)
- packages/fulfillment/src/providers/printful.ts (+48 lines)
- packages/fulfillment/src/providers/printify.ts (+46 lines)
- packages/api/src/studio/products.ts (+30 lines)
- apps/web/app/(studio)/studio/components/studio-wizard.tsx (refactored steps 4-5)

## Next Steps (Phase B)

1. **Fulfillment Automation** (urgent)
   - Activate fulfillment job trigger in success page
   - Implement CloudPrinter order creation in worker

2. **Quantity Selector** (optional)
   - Add quantity input to ProductCardEnhanced
   - Recalculate total dynamically

3. **Mockup Generation** (recommended)
   - Create MOCKUP job after AI generation
   - Display product mockup in preview step

4. **Order Tracking** (medium-term)
   - Create order detail page
   - Integrate CloudPrinter webhooks

---

Breaking Changes: None
Deprecations: None
Migration Guide: Not required

Closes: N/A (feature development)
Related: Stripe integration, CloudPrinter SDK
