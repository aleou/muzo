import { Prisma, ProjectStatus, JobType } from '@prisma/client';
import { prisma } from '@muzo/db';
import { GenerationJob, enqueueJob } from '@muzo/queue';
import { z } from 'zod';
import { hasFreePreviewAvailable } from './projects';

const requestGenerationSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  stage: z.enum(['preview', 'final']).default('preview'),
});

function buildGenerationPayload(params: {
  project: {
    id: string;
    promptText: string;
    inputImageUrl: string;
    previewCount: number;
    style?: {
      id: string;
      prompt: string;
      negativePrompt: string | null;
      parameters: unknown | null;
    } | null;
  };
  stage: 'preview' | 'final';
}): GenerationJob {
  const { project, stage } = params;
  const prompt = project.promptText.trim();

  const stylePreset = project.style
    ? {
        prompt: project.style.prompt,
        negativePrompt: project.style.negativePrompt ?? undefined,
        parameters: project.style.parameters ?? undefined,
      }
    : undefined;

  const job: GenerationJob = {
    projectId: project.id,
    prompt: prompt.length === 0 ? 'Creation artistique personnalisee' : prompt,
    negativePrompt: stylePreset?.negativePrompt,
    style: {
      id: project.style?.id ?? 'custom',
      preset: stylePreset,
    },
    inputImageUrl: project.inputImageUrl,
    parameters:
      stage === 'preview'
        ? {
            stage: 'preview',
            quality: 'medium',
            size: '1024x1024',
            background: 'auto',
            moderation: 'auto',
            n: 1,
          }
        : {
            stage: 'final',
            quality: 'high',
            size: '1024x1536',
            background: 'auto',
            moderation: 'auto',
            n: 1,
            upscale: {
              target: '4k',
              provider: 'runpod',
            },
          },
  };

  return job;
}

export async function requestProjectGeneration(input: unknown) {
  const payload = requestGenerationSchema.parse(input);

  const project = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      userId: payload.userId,
    },
    include: {
      style: true,
    },
  });

  if (!project) {
    throw new Error('Projet introuvable ou non autorise');
  }

  if (payload.stage === 'preview' && !hasFreePreviewAvailable(project)) {
    throw new Error('La generation gratuite a deja ete utilisee');
  }

  const generationJobPayload = buildGenerationPayload({
    project,
    stage: payload.stage,
  });

  let result: { project: { id: string }; jobRecord: { id: string } } | null = null;

  try {
    result = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: project.id },
        data: {
          status: ProjectStatus.GENERATING,
          ...(payload.stage === 'preview' ? { previewCount: { increment: 1 } } : {}),
        },
      });

      const jobRecord = await enqueueJob(tx, {
        type: JobType.GENERATION,
        payload: generationJobPayload,
        projectId: updatedProject.id,
      });

      return { project: updatedProject, jobRecord };
    });
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2031') ||
      (error instanceof Prisma.PrismaClientValidationError && error.message.includes('previewCount'))
    ) {
      console.warn(
        '[studio] Generation fallback triggered; MongoDB replica set not available or previewCount not supported by Prisma client.',
      );
      result = await requestProjectGenerationWithoutReplicaSet({
        project,
        stage: payload.stage,
        generationJobPayload,
      });
    } else {
      throw error;
    }
  }

  if (!result) {
    throw new Error('Generation request failed without result');
  }

  return {
    project: result.project,
    jobId: result.jobRecord.id,
    stage: payload.stage,
  };
}

async function requestProjectGenerationWithoutReplicaSet(params: {
  project: {
    id: string;
    userId: string;
    previewCount: unknown;
  };
  stage: 'preview' | 'final';
  generationJobPayload: GenerationJob;
}) {
  const now = new Date();

  const setDocument: Record<string, unknown> = {
    status: ProjectStatus.GENERATING,
    updatedAt: toMongoDate(now),
  };

  if (params.stage === 'preview') {
    const current = resolvePreviewCount(params.project.previewCount);
    setDocument.previewCount = current + 1;
  }

  await prisma.$runCommandRaw({
    update: 'Project',
    updates: [
      {
        q: {
          _id: toMongoObjectId(params.project.id),
          userId: toMongoObjectId(params.project.userId),
        },
        u: [
          {
            $set: setDocument,
          },
        ],
        multi: false,
      },
    ],
  });

  const updatedProject = await prisma.project.findUniqueOrThrow({
    where: { id: params.project.id },
  });

  const jobRecord = await enqueueJob(prisma, {
    type: JobType.GENERATION,
    payload: params.generationJobPayload,
    projectId: params.project.id,
  });

  return { project: updatedProject, jobRecord };
}

function resolvePreviewCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    try {
      const numeric = (value as { toNumber: () => number }).toNumber();
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    } catch {
      // ignore conversion failures
    }
  }

  return 0;
}

function toMongoObjectId(id: string) {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new Error('Invalid ObjectId string: ' + id);
  }
  return { $oid: id };
}

function toMongoDate(date: Date) {
  return {
    $date: {
      $numberLong: date.getTime().toString(),
    },
  };
}
