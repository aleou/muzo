import { NextRequest, NextResponse } from 'next/server';
import { getSignedS3ObjectUrl } from '@/lib/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const key = params.path.join('/');

    if (!key) {
      return NextResponse.json({ error: 'Missing image path' }, { status: 400 });
    }

    // Générer une URL signée avec une durée de 1 heure
    const signedUrl = await getSignedS3ObjectUrl(key, { expiresIn: 3600 });

    // Rediriger vers l'URL signée
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
