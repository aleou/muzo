import { NextResponse } from 'next/server';
import { listStudioProducts } from '@muzo/api';

export async function GET() {
  try {
    const products = await listStudioProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Failed to list studio products', error);
    return NextResponse.json({ error: 'unable_to_load_products' }, { status: 500 });
  }
}
