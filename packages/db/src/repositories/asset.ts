import { prisma } from '../prisma-client';
import type { Prisma } from '@prisma/client';

export function createAsset(data: Prisma.AssetCreateInput) {
  return prisma.asset.create({ data });
}

export function listAssetsByOwner(ownerId: string) {
  return prisma.asset.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
}


