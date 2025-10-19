import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { createProjectFromUpload } from '@muzo/api';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createProjectFromUpload({ ...body, userId: session.user.id });

    return NextResponse.json({ project: result.project, asset: result.asset });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to create studio project', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
