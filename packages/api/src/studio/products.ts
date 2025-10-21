import { Provider } from '@prisma/client';
import { getFulfillmentProvider } from '@muzo/fulfillment';

export type StudioProductVariant = {
  id: string;
  label: string;
  sizeHint?: string;
  pieces?: number;
  dpiRequirement: number;
  price?: number;
  shipping?: number;
  currency?: string;
};

export type StudioProduct = {
  provider: Provider;
  productId: string;
  name: string;
  kind: 'puzzle' | 'poster' | 'canvas' | 'other';
  description?: string;
  variants: StudioProductVariant[];
};

type CuratedProduct = {
  productId: string;
  name: string;
  kind: StudioProduct['kind'];
  description?: string;
  variantIds?: string[];
  fallbackVariants: StudioProductVariant[];
};

const curatedCatalog: Record<Provider, CuratedProduct[]> = {
  [Provider.PRINTFUL]: [],  // Désactivé pour le moment
  [Provider.PRINTIFY]: [],  // Désactivé pour le moment
  [Provider.CLOUDPRINTER]: [
    {
      // Real CloudPrinter product ID: Puzzle with box 680x480 mm - 1000 pieces
      productId: 'puzzle_680x480_mm_1000_pieces',
      name: 'Puzzle photo premium',
      kind: 'puzzle',
      description: 'Puzzle cartonné 1000 pièces (68×48 cm) avec boîte, idéal pour cadeaux familiaux.',
      variantIds: ['puzzle_680x480_mm_1000_pieces'],
      fallbackVariants: [
        {
          id: 'puzzle_680x480_mm_1000_pieces',
          label: '1000 pièces (68×48 cm)',
          pieces: 1000,
          sizeHint: '68×48 cm',
          dpiRequirement: 300,
          price: 19.95,
          shipping: 3.95,
          currency: 'EUR',
        },
      ],
    },
  ],
};

const providerMap: Record<Provider, 'printful' | 'printify' | 'cloudprinter'> = {
  [Provider.PRINTFUL]: 'printful',
  [Provider.PRINTIFY]: 'printify',
  [Provider.CLOUDPRINTER]: 'cloudprinter',
};

async function fetchProviderCatalog(provider: Provider): Promise<StudioProduct[]> {
  const curations = curatedCatalog[provider] ?? [];
  if (curations.length === 0) {
    return [];
  }

  try {
    const service = await getFulfillmentProvider(providerMap[provider]);
    const productList = await service.listProducts();

    return Promise.all(
      curations.map(async (curated) => {
        const productMeta = productList.find((product) => product.id === curated.productId);
        let variants = curated.fallbackVariants;

        try {
          const providerVariants = await service.listVariants(curated.productId);
          const filtered = curated.variantIds
            ? providerVariants.filter((variant) => curated.variantIds?.includes(variant.id))
            : providerVariants;

          if (filtered.length > 0) {
            // Fetch pricing for each variant
            const variantsWithPricing = await Promise.all(
              filtered.map(async (variant) => {
                try {
                  const quote = await service.getQuote(curated.productId, variant.id, 1);
                  return {
                    id: variant.id,
                    label: variant.size,
                    dpiRequirement: variant.dpiRequirement,
                    price: quote.price,
                    shipping: quote.shipping,
                    currency: quote.currency,
                  };
                } catch (quoteError) {
                  // Fallback without pricing if quote fails
                  return {
                    id: variant.id,
                    label: variant.size,
                    dpiRequirement: variant.dpiRequirement,
                  };
                }
              })
            );
            variants = variantsWithPricing;
          }
        } catch (variantError) {
          // Silently fallback to curated variants when provider call fails
        }

        return {
          provider,
          productId: curated.productId,
          name: productMeta?.name ?? curated.name,
          kind: curated.kind,
          description: curated.description,
          variants,
        } satisfies StudioProduct;
      }),
    );
  } catch (error) {
    return curations.map((curated) => ({
      provider,
      productId: curated.productId,
      name: curated.name,
      kind: curated.kind,
      description: curated.description,
      variants: curated.fallbackVariants,
    }));
  }
}

export async function listStudioProducts() {
  // Pour le moment, on utilise uniquement CloudPrinter
  // Printful et Printify sont désactivés
  const cloudprinter = await fetchProviderCatalog(Provider.CLOUDPRINTER);
  
  return cloudprinter;
}
