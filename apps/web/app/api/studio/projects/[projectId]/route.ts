import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { saveProjectProductSelection, updateProjectBrief } from '@muzo/api';

export async function PATCH(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const project = await updateProjectBrief({
      ...body,
      projectId: params.projectId,
      userId: session.user.id,
    });

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to update studio project', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const project = await saveProjectProductSelection({
      ...body,
      projectId: params.projectId,
      userId: session.user.id,
    });

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to save project product selection', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
