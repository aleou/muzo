import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { createProjectFromUpload, getProjectForStudio } from '@muzo/api';
import { getSignedS3ObjectUrl } from '@/lib/s3';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createProjectFromUpload({ ...body, userId: session.user.id });
    const asset = result.asset;
    const assetKey =
      asset && typeof asset === 'object' && 's3Key' in asset && typeof asset.s3Key === 'string'
        ? asset.s3Key
        : typeof body?.s3Key === 'string'
          ? body.s3Key
          : null;

    let signedAssetUrl: string | null = null;

    if (assetKey) {
      try {
        signedAssetUrl = await getSignedS3ObjectUrl(assetKey, { expiresIn: 3600 });
      } catch (signError) {
        console.warn('[studio] Failed to sign asset url', signError);
      }
    }

    const responseAsset =
      asset && typeof asset === 'object'
        ? {
            ...asset,
            url: signedAssetUrl ?? asset.url,
            signedUrl: signedAssetUrl ?? undefined,
          }
        : asset;

    const enrichedProject = await getProjectForStudio({
      projectId: result.project.id,
      userId: session.user.id,
    });

    const responseProject = enrichedProject ?? {
      ...result.project,
      inputImageUrl: signedAssetUrl ?? result.project.inputImageUrl,
      signedInputImageUrl: signedAssetUrl ?? undefined,
      previews: [],
    };

    return NextResponse.json({ project: responseProject, asset: responseAsset, previews: responseProject.previews ?? [] });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to create studio project', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
