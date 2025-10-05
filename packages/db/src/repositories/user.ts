import { prisma } from '../prisma-client';

export function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function getFirstUser() {
  return prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
}


