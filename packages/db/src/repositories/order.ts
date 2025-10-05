import { prisma } from '../prisma-client';
import type { Prisma } from '@prisma/client';

export function createOrder(data: Prisma.OrderCreateInput) {
  return prisma.order.create({ data });
}

export function updateOrderStatus(id: string, status: Prisma.OrderUpdateInput['status']) {
  return prisma.order.update({ where: { id }, data: { status } });
}

export function findOrderByStripeSession(stripeSessionId: string) {
  return prisma.order.findUnique({ where: { stripeSessionId } });
}

export function listOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      project: {
        include: {
          outputs: true,
        },
      },
    },
  });
}


