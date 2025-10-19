import { Provider } from '@prisma/client';
import { getFulfillmentProvider } from '@muzo/fulfillment';

export type StudioProductVariant = {
  id: string;
  label: string;
  sizeHint?: string;
  pieces?: number;
  dpiRequirement: number;
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
  [Provider.PRINTFUL]: [
    {
      productId: '205',
      name: 'Puzzle photo premium',
      kind: 'puzzle',
      description: 'Puzzle cartonne finition satinee, ideal pour cadeaux familiaux.',
      variantIds: ['7511', '7512', '7513'],
      fallbackVariants: [
        {
          id: '7513',
          label: '1000 pieces (5070 cm)',
          pieces: 1000,
          sizeHint: '5070 cm',
          dpiRequirement: 300,
        },
        {
          id: '7512',
          label: '500 pieces (4050 cm)',
          pieces: 500,
          sizeHint: '4050 cm',
          dpiRequirement: 300,
        },
      ],
    },
    {
      productId: '4010',
      name: 'Poster photo premium',
      kind: 'poster',
      description: 'Impression Fine Art sur papier mat 200 g/m2.',
      variantIds: ['16831', '16835'],
      fallbackVariants: [
        {
          id: '16831',
          label: '5070 cm',
          sizeHint: '5070 cm',
          dpiRequirement: 240,
        },
        {
          id: '16835',
          label: '70100 cm',
          sizeHint: '70100 cm',
          dpiRequirement: 240,
        },
      ],
    },
  ],
  [Provider.PRINTIFY]: [
    {
      productId: '62',
      name: 'Puzzle rigide premium',
      kind: 'puzzle',
      description: 'Puzzle Printify epaisseur 2 mm, revetement semi-brillant.',
      variantIds: ['721', '722'],
      fallbackVariants: [
        {
          id: '722',
          label: '1000 pieces',
          pieces: 1000,
          sizeHint: '5070 cm',
          dpiRequirement: 300,
        },
        {
          id: '721',
          label: '500 pieces',
          pieces: 500,
          sizeHint: '4050 cm',
          dpiRequirement: 300,
        },
      ],
    },
    {
      productId: '22',
      name: 'Poster satine',
      kind: 'poster',
      description: 'Poster satine 210 g/m2 avec couleurs vives.',
      variantIds: ['2011', '2013'],
      fallbackVariants: [
        {
          id: '2011',
          label: '5070 cm',
          sizeHint: '5070 cm',
          dpiRequirement: 210,
        },
        {
          id: '2013',
          label: '70100 cm',
          sizeHint: '70100 cm',
          dpiRequirement: 210,
        },
      ],
    },
  ],
};

const providerMap: Record<Provider, 'printful' | 'printify'> = {
  [Provider.PRINTFUL]: 'printful',
  [Provider.PRINTIFY]: 'printify',
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
            variants = filtered.map((variant) => ({
              id: variant.id,
              label: variant.size,
              dpiRequirement: variant.dpiRequirement,
            }));
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
  const [printful, printify] = await Promise.all([
    fetchProviderCatalog(Provider.PRINTFUL),
    fetchProviderCatalog(Provider.PRINTIFY),
  ]);

  return [...printful, ...printify];
}
