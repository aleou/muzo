import { prisma } from '../prisma-client';
import type { Prisma } from '@prisma/client';

export function listStyles() {
  return prisma.style.findMany({ orderBy: { name: 'asc' } });
}

export function seedStyles(styles: Prisma.StyleCreateInput[]) {
  return Promise.all(
    styles.map((style) =>
      prisma.style.upsert({
        where: { name: style.name },
        create: style,
        update: style,
      }),
    ),
  );
}


