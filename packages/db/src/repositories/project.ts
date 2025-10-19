import { ProjectStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma-client';

// TODO(domain): Replace legacy Project accessors with StudioProject aggregate + transactional state transitions once domain layer exists.
export function createProject(data: Prisma.ProjectCreateInput) {
  return prisma.project.create({ data });
}

export function getProjectById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export function updateProject(id: string, data: Prisma.ProjectUpdateInput) {
  return prisma.project.update({ where: { id }, data });
}

export function listProjectsByUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      outputs: {
        orderBy: { createdAt: 'desc' },
      },
      orders: {
        select: {
          id: true,
          status: true,
          price: true,
          currency: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function upsertGenerationResult(result: {
  projectId: string;
  outputs: Prisma.ProjectOutputCreateWithoutProjectInput[];
  status?: 'READY' | 'FAILED';
}) {
  const status = result.status ?? ProjectStatus.READY;

  return prisma.project.update({
    where: { id: result.projectId },
    data: {
      status,
      outputs: {
        create: result.outputs,
      },
    },
    include: {
      outputs: true,
    },
  });
}
