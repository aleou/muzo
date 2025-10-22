import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CloudPrinter } from '@muzo/cloudprinter';

// Catégories avec filtrage selon l'orientation
type Orientation = 'portrait' | 'landscape';

const PRODUCT_CATEGORIES = [
  {
    id: 'posters',
    name: 'Posters & Affiches',
    description: 'Impressions haute qualité sur papier premium',
    icon: '🖼️',
    orientations: ['portrait', 'landscape'] as Orientation[],
  },
  {
    id: 'canvas',
    name: 'Tableaux Canvas',
    description: 'Toiles tendues sur châssis en bois',
    icon: '🎨',
    orientations: ['portrait', 'landscape'] as Orientation[],
  },
  {
    id: 'puzzles',
    name: 'Puzzles Photo',
    description: 'Puzzles personnalisés avec boîte',
    icon: '🧩',
    orientations: ['landscape'] as Orientation[],
  },
  {
    id: 'calendars',
    name: 'Calendriers',
    description: 'Calendriers muraux personnalisés',
    icon: '📅',
    orientations: ['portrait'] as Orientation[],
  },
  {
    id: 'cards',
    name: 'Cartes & Faire-parts',
    description: 'Cartes postales et invitations',
    icon: '💌',
    orientations: ['portrait', 'landscape'] as Orientation[],
  },
];

// Mapping des produits CloudPrinter vers nos catégories
const CLOUDPRINTER_CATEGORY_MAP: Record<string, string> = {
  'poster': 'posters',
  'canvas': 'canvas',
  'puzzle': 'puzzles',
  'calendar': 'calendars',
  'postcard': 'cards',
  'greeting_card': 'cards',
};

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orientation = searchParams.get('orientation') as Orientation | null;
    const categoryId = searchParams.get('category');

    // Si aucune catégorie n'est demandée, retourner juste la liste des catégories
    if (!categoryId) {
      const filteredCategories = orientation
        ? PRODUCT_CATEGORIES.filter(cat => cat.orientations.includes(orientation))
        : PRODUCT_CATEGORIES;

      // Retourner les catégories sans produits (compteurs à 0 par défaut)
      const catalog = filteredCategories.map(category => ({
        ...category,
        productCount: 0, // Sera mis à jour quand la catégorie est chargée
        products: [],
      }));

      return NextResponse.json({
        categories: catalog,
        orientation,
      });
    }

    // Charger les produits seulement pour la catégorie demandée
    const client = new CloudPrinter({
      apiKey: process.env.CLOUDPRINTER_API_KEY || '',
    });
    
    const productsService = client.products;
    const allProducts = await productsService.list();

    // Filtrer uniquement les produits de la catégorie demandée
    const categoryProducts = allProducts
      .filter(product => {
        const cloudprinterCategory = product.category?.toLowerCase() || '';
        const mappedCategory = CLOUDPRINTER_CATEGORY_MAP[cloudprinterCategory] || 'posters';
        return mappedCategory === categoryId;
      })
      .map(product => ({
        id: product.reference,
        name: product.name,
        note: product.note,
        category: categoryId,
        fromPrice: product.from_price,
        currency: product.currency || 'EUR',
        options: [],
        specs: [],
      }));

    // Préparer la réponse avec la catégorie chargée
    const filteredCategories = orientation
      ? PRODUCT_CATEGORIES.filter(cat => cat.orientations.includes(orientation))
      : PRODUCT_CATEGORIES;

    const catalog = filteredCategories.map(category => ({
      ...category,
      productCount: category.id === categoryId ? categoryProducts.length : 0,
      products: category.id === categoryId ? categoryProducts : [],
    }));

    return NextResponse.json({
      categories: catalog,
      orientation,
    });
  } catch (error) {
    console.error('Failed to fetch catalog', error);
    return NextResponse.json(
      { error: 'unable_to_load_catalog', message: String(error) },
      { status: 500 }
    );
  }
}
