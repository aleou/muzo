import { AssetType, ProjectStatus, Provider, Prisma } from '@prisma/client';
import { prisma } from '@muzo/db';
import { z } from 'zod';
import { getSignedS3ObjectUrl, extractS3KeyFromUrl } from '../utils/s3';

const createProjectFromUploadSchema = z.object({
  userId: z.string().min(1),
  originalFilename: z.string().min(1),
  s3Key: z.string().min(1),
  publicUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpi: z.number().int().positive().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  mimeType: z.string().optional(),
});

const getProjectForStudioSchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
});

const defaultPromptText =
  "Parlez-nous du rendu final que vous voulez obtenir (ambiance, couleurs, style artistique).";

const defaultPromptHints = [
  {
    id: 'subject',
    title: 'Sujet principal',
    description:
      'Qui ou quoi doit etre mis en valeur ? Exemple :  notre golden retriever en plein saut ',
  },
  {
    id: 'ambiance',
    title: 'Ambiance & emotion',
    description:
      'Precisez latmosphere (douce, festive, dramatique) et les couleurs dominantes pour guider la generation.',
  },
  {
    id: 'style',
    title: 'Style artistique',
    description:
      'Illustration pastel, photo realiste, peinture a lhuile... Inspirez-vous de nos suggestions si besoin.',
  },
] as const;

function generateProjectTitle(filename: string) {
  const baseName = filename.replace(/\s+/g, ' ').trim();
  const withoutExtension = baseName.replace(/\.[^.]+$/, '');

  if (withoutExtension.length > 0) {
    return withoutExtension.length > 80
      ? withoutExtension.slice(0, 77).trimEnd() + '...'
      : withoutExtension;
  }

  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `Projet MUZO ${date}`;
}

export type CreateProjectFromUploadInput = z.infer<typeof createProjectFromUploadSchema>;

export async function getProjectForStudio(input: unknown) {
  const payload = getProjectForStudioSchema.parse(input);

  const project = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      userId: payload.userId,
    },
    include: {
      outputs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    return null;
  }

  const previews = await Promise.all(
    project.outputs.map(async (output) => {
      let signedUrl = output.url;

      // Extract S3 key from URL and generate signed URL
      const s3Key = extractS3KeyFromUrl(output.url);
      if (s3Key) {
        try {
          signedUrl = await getSignedS3ObjectUrl(s3Key, { expiresIn: 3600 });
        } catch (error) {
          console.error('Failed to sign output URL:', error);
          // Keep original URL as fallback
        }
      }

      return {
        id: output.id,
        url: signedUrl,
        createdAt:
          output.createdAt instanceof Date
            ? output.createdAt.toISOString()
            : new Date(output.createdAt ?? Date.now()).toISOString(),
      };
    }),
  );

  // Sign the input image URL as well
  let signedInputImageUrl = project.inputImageUrl;
  if (project.inputImageUrl) {
    const inputKey = extractS3KeyFromUrl(project.inputImageUrl);
    if (inputKey) {
      try {
        signedInputImageUrl = await getSignedS3ObjectUrl(inputKey, { expiresIn: 3600 });
      } catch (error) {
        console.error('Failed to sign input image URL:', error);
        // Keep original URL as fallback
      }
    }
  }

  const { outputs, ...rest } = project;

  return {
    ...rest,
    inputImageUrl: project.inputImageUrl,
    signedInputImageUrl,
    createdAt:
      project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
    updatedAt:
      project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
    previews,
  };
}

export async function createProjectFromUpload(input: unknown) {
  const payload = createProjectFromUploadSchema.parse(input);
  const dpi = payload.dpi ?? 300;
  const title = generateProjectTitle(payload.originalFilename);

  const assetData: AssetInsertData = {
    ownerId: payload.userId,
    type: AssetType.INPUT,
    s3Key: payload.s3Key,
    url: payload.publicUrl,
    width: payload.width,
    height: payload.height,
    dpi,
    metadata: {
      sizeBytes: payload.sizeBytes ?? null,
      mimeType: payload.mimeType ?? null,
      originalFilename: payload.originalFilename,
    },
  };

  const projectData: ProjectInsertData = {
    userId: payload.userId,
    title,
    inputImageUrl: payload.publicUrl,
    promptText: defaultPromptText,
    status: ProjectStatus.DRAFT,
    previewCount: 0,
    promptHints: defaultPromptHints,
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({ data: assetData });
      const project = await tx.project.create({ data: projectData });
      return { project, asset };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2031') {
      console.warn(
        '[studio] Transaction fallback triggered; MongoDB replica set not available.',
      );
      return await createProjectAndAssetWithoutReplicaSet(assetData, projectData);
    }

    throw err;
  }
}

type AssetInsertData = {
  ownerId: string;
  type: AssetType;
  s3Key: string;
  url: string;
  width: number;
  height: number;
  dpi: number;
  metadata: {
    sizeBytes: number | null;
    mimeType: string | null;
    originalFilename: string;
  };
};

type ProjectInsertData = {
  userId: string;
  title: string;
  inputImageUrl: string;
  promptText: string;
  status: ProjectStatus;
  previewCount: number;
  promptHints: typeof defaultPromptHints;
};

async function createProjectAndAssetWithoutReplicaSet(
  assetData: AssetInsertData,
  projectData: ProjectInsertData,
) {
  const now = new Date();

  const assetInsertResult = await prisma.$runCommandRaw({
    insert: 'Asset',
    documents: [
      {
        ownerId: toMongoObjectId(assetData.ownerId),
        type: assetData.type,
        s3Key: assetData.s3Key,
        url: assetData.url,
        width: assetData.width,
        height: assetData.height,
        dpi: assetData.dpi,
        colorProfile: null,
        metadata: {
          sizeBytes: assetData.metadata.sizeBytes,
          mimeType: assetData.metadata.mimeType,
          originalFilename: assetData.metadata.originalFilename,
        },
        createdAt: toMongoDate(now),
      },
    ],
  });

  const assetId =
    extractInsertResultId(assetInsertResult) ??
    (await prisma.asset
      .findFirst({
        where: {
          ownerId: assetData.ownerId,
          s3Key: assetData.s3Key,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
        },
      })
      .then((record) => record?.id));

  if (!assetId) {
    throw new Error('Asset creation failed without replica-set support');
  }

  const projectInsertResult = await prisma.$runCommandRaw({
    insert: 'Project',
    documents: [
      {
        userId: toMongoObjectId(projectData.userId),
        title: projectData.title,
        inputImageUrl: projectData.inputImageUrl,
        promptText: projectData.promptText,
        status: projectData.status,
        productProvider: null,
        productId: null,
        productVariantId: null,
        productOptions: null,
        previewCount: projectData.previewCount,
        promptHints: projectData.promptHints,
        styleId: null,
        createdAt: toMongoDate(now),
        updatedAt: toMongoDate(now),
      },
    ],
  });

  const projectId =
    extractInsertResultId(projectInsertResult) ??
    (await prisma.project
      .findFirst({
        where: {
          userId: projectData.userId,
          inputImageUrl: projectData.inputImageUrl,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
        },
      })
      .then((record) => record?.id));

  if (!projectId) {
    throw new Error('Project creation failed without replica-set support');
  }

  const [asset, project] = await Promise.all([
    prisma.asset.findUniqueOrThrow({ where: { id: assetId } }),
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
  ]);

  return { asset, project };
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

function extractInsertResultId(result: unknown): string | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const insertedId = (result as { insertedId?: unknown }).insertedId;
  if (insertedId) {
    const parsed = parseExtendedObjectId(insertedId);
    if (parsed) {
      return parsed;
    }
  }

  const insertedIds = (result as { insertedIds?: unknown }).insertedIds;

  if (Array.isArray(insertedIds)) {
    for (const value of insertedIds) {
      const parsed = parseExtendedObjectId(value);
      if (parsed) {
        return parsed;
      }
    }
  } else if (insertedIds && typeof insertedIds === 'object') {
    const values = Object.values(insertedIds as Record<string, unknown>);
    for (const value of values) {
      const parsed = parseExtendedObjectId(value);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

function parseExtendedObjectId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }

  if (value && typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function') {
    const serialized = (value as { toString: () => string }).toString();
    if (/^[a-fA-F0-9]{24}$/.test(serialized)) {
      return serialized;
    }
  }

  if (value && typeof value === 'object' && '$oid' in value) {
    const objectId = (value as { $oid?: unknown }).$oid;
    return typeof objectId === 'string' ? objectId : null;
  }

  return null;
}

const updateProjectBriefSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1).max(120),
  promptText: z.string().min(1).max(4000),
  styleId: z.string().optional(),
  promptHints: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
});

export type UpdateProjectBriefInput = z.infer<typeof updateProjectBriefSchema>;

export async function updateProjectBrief(input: unknown) {
  const payload = updateProjectBriefSchema.parse(input);
  const existing = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      userId: payload.userId,
    },
  });

  if (!existing) {
    throw new Error('Projet introuvable ou non autorise');
  }

  const normalizedPromptHints = (payload.promptHints ?? defaultPromptHints).map((hint) => ({
    id: hint.id,
    title: hint.title,
    description: hint.description,
  }));

  const updateData = {
    title: payload.title,
    promptText: payload.promptText,
    promptHints: normalizedPromptHints as Prisma.InputJsonValue,
    updatedAt: new Date(),
  } satisfies Pick<Prisma.ProjectUpdateInput, 'title' | 'promptText' | 'promptHints' | 'updatedAt'>;

  const styleIdValue = payload.styleId;

  try {
    const project = await prisma.project.update({
      where: {
        id: payload.projectId,
      },
      data: {
        title: updateData.title,
        promptText: updateData.promptText,
        promptHints: updateData.promptHints,
        updatedAt: updateData.updatedAt,
        ...(styleIdValue === undefined
          ? {}
          : {
              styleId:
                styleIdValue === ''
                  ? null
                  : styleIdValue,
            }),
      },
    });

    return project;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientValidationError &&
      error.message.includes('promptHints')
    ) {
      return await updateProjectBriefWithoutReplicaSet({
        ...payload,
        promptHints: normalizedPromptHints,
      });
    }

    throw error;
  }
}

async function updateProjectBriefWithoutReplicaSet(params: {
  projectId: string;
  userId: string;
  title: string;
  promptText: string;
  styleId?: string | null;
  promptHints: Array<{ id: string; title: string; description: string }>;
}) {
  const updatedAt = new Date();

  const updateDocument: Record<string, unknown> = {
    title: params.title,
    promptText: params.promptText,
    promptHints: params.promptHints.map((hint) => ({
      id: hint.id,
      title: hint.title,
      description: hint.description,
    })),
    updatedAt: toMongoDate(updatedAt),
  };

  if (params.styleId === undefined) {
    // no-op
  } else if (params.styleId === null || params.styleId === '') {
    updateDocument.styleId = null;
  } else {
    updateDocument.styleId = toMongoObjectId(params.styleId);
  }

  await prisma.$runCommandRaw({
    update: 'Project',
    updates: [
      {
        q: {
          _id: toMongoObjectId(params.projectId),
          userId: toMongoObjectId(params.userId),
        },
        u: [
          {
            $set: updateDocument,
          },
        ],
        multi: false,
      },
    ] as any,
  });

  return prisma.project.findUniqueOrThrow({
    where: { id: params.projectId },
  });
}

const recordPreviewUsageSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export type IncrementPreviewCountInput = z.infer<typeof recordPreviewUsageSchema>;

export async function incrementPreviewCount(input: unknown) {
  const payload = recordPreviewUsageSchema.parse(input);

  const project = await prisma.project.update({
    where: {
      id: payload.projectId,
      userId: payload.userId,
    },
    data: {
      previewCount: { increment: 1 },
    },
  });

  return normalizePreviewCount(project.previewCount);
}

const productSelectionSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  provider: z.nativeEnum(Provider).optional(),
  productId: z.string().optional(),
  productVariantId: z.string().optional(),
  productOptions: z.record(z.string(), z.unknown()).optional(),
});

export type SaveProjectProductSelectionInput = z.infer<typeof productSelectionSchema>;

export async function saveProjectProductSelection(input: unknown): Promise<any> {
  const payload = productSelectionSchema.parse(input) as {
    projectId: string;
    userId: string;
    provider?: Provider;
    productId?: string;
    productVariantId?: string;
    productOptions?: Record<string, unknown>;
  };

  const data: Record<string, unknown> = {
    productId: payload.productId ?? null,
    productVariantId: payload.productVariantId ?? null,
    productOptions: payload.productOptions ?? null,
  };

  if (payload.provider) {
    data.productProvider = payload.provider;
  }

  const project = await prisma.project.update({
    where: { id: payload.projectId, userId: payload.userId },
    data,
  });

  return project;
}

function normalizePreviewCount(value: unknown): number {
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
      // ignore conversion failures and fall back to zero
    }
  }

  return 0;
}

export function hasFreePreviewAvailable(project: { previewCount?: unknown }) {
  return normalizePreviewCount(project.previewCount) < 1;
}
