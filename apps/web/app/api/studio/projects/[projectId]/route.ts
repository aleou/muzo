import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { getProjectForStudio, saveProjectProductSelection, updateProjectBrief } from '@muzo/api';

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const project = await getProjectForStudio({
      projectId: params.projectId,
      userId: session.user.id,
    });

    if (!project) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const statusMessage =
      project.status === 'GENERATING'
        ? 'Generation en cours...'
        : project.status === 'FAILED'
        ? 'La derniere generation a echoue'
        : '';

    return NextResponse.json({
      project,
      previews: project.previews ?? [],
      statusMessage,
    });
  } catch (error) {
    console.error('Failed to fetch studio project', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

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
    const enriched = await getProjectForStudio({
      projectId: project.id,
      userId: session.user.id,
    });

    const responseProject = enriched ?? { ...project, previews: [] };

    return NextResponse.json({ project: responseProject, previews: responseProject.previews ?? [] });
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
    const enriched = await getProjectForStudio({
      projectId: project.id,
      userId: session.user.id,
    });

    const responseProject = enriched ?? { ...project, previews: [] };

    return NextResponse.json({ project: responseProject, previews: responseProject.previews ?? [] });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_payload', details: error.flatten() }, { status: 400 });
    }

    console.error('Failed to save project product selection', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
