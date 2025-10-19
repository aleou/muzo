import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { requestProjectGeneration } from '@muzo/api';

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await requestProjectGeneration({
      projectId: params.projectId,
      userId: session.user.id,
      ...body,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to request studio generation', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
