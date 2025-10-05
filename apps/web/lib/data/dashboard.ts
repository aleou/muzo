import { getUserById } from '@muzo/db/repositories/user';
import { listOrdersByUser } from '@muzo/db/repositories/order';
import { listProjectsByUser } from '@muzo/db/repositories/project';

export async function getDashboardData(userId: string) {
  const userRecord = await getUserById(userId);

  if (!userRecord) {
    return {
      user: null,
      projects: [],
      orders: [],
    } as const;
  }

  const [projects, orders] = await Promise.all([
    listProjectsByUser(userRecord.id),
    listOrdersByUser(userRecord.id),
  ]);

  return {
    user: userRecord,
    projects,
    orders,
  } as const;
}


