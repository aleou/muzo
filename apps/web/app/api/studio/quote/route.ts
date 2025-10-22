import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CloudPrinter } from '@muzo/cloudprinter';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, productOptions, quantity = 1, countryCode = 'FR' } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'missing_required_fields' },
        { status: 400 }
      );
    }

    // Convert productOptions object to CloudPrinter options array
    // productOptions = { "type_puzzle_addon": "puzzle_box_printed_373x273x56_mm", ... }
    // → optionsArray = [{ type: "puzzle_box_printed_373x273x56_mm", count: "1" }, ...]
    const optionsArray: Array<{ type: string; count: string }> = productOptions
      ? Object.values(productOptions).map((reference: any) => ({
          type: reference as string, // The option reference becomes the 'type'
          count: quantity.toString(),
        }))
      : [];

    // Récupérer le devis depuis CloudPrinter
    const client = new CloudPrinter({
      apiKey: process.env.CLOUDPRINTER_API_KEY || '',
    });

    const quote = await client.quotes.getEUR(countryCode, [
      {
        product: productId,
        reference: productId,
        count: quantity.toString(),
        options: optionsArray,
      },
    ]);

    // Extraire les informations du devis
    const productPrice = parseFloat(quote.subtotals.items || '0');
    const shippingPrice = parseFloat(quote.shipments[0]?.quotes[0]?.price || '0');
    const totalPrice = parseFloat(quote.price || '0');

    return NextResponse.json({
      productPrice,
      shippingPrice,
      totalPrice,
      currency: quote.currency || 'EUR',
      details: {
        productReference: productId,
        quantity,
        vat: parseFloat(quote.vat || '0'),
      },
    });
  } catch (error) {
    console.error('Failed to get quote', error);
    return NextResponse.json(
      { error: 'unable_to_get_quote', message: String(error) },
      { status: 500 }
    );
  }
}
