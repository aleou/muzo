import { PrismaClient, type Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaLogLevels: Prisma.LogLevel[] = ['info', 'warn', 'error'];

if (process.env.PRISMA_LOG_QUERIES === 'true') {
  prismaLogLevels.push('query');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogLevels,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
