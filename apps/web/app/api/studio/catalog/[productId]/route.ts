import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CloudPrinter } from '@muzo/cloudprinter';

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { productId } = params;

    // Récupérer les détails du produit depuis CloudPrinter
    const client = new CloudPrinter({
      apiKey: process.env.CLOUDPRINTER_API_KEY || '',
    });
    
    const details = await client.products.get(productId);

    return NextResponse.json({
      id: productId,
      options: details.options || [],
      specs: details.specs || [],
    });
  } catch (error) {
    console.error('Failed to fetch product details', error);
    return NextResponse.json(
      { error: 'unable_to_load_product', message: String(error) },
      { status: 500 }
    );
  }
}
