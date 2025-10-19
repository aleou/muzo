import { getUserById } from '@muzo/db/repositories/user';
import { listOrdersByUser } from '@muzo/db/repositories/order';
import { listProjectsByUser } from '@muzo/db/repositories/project';

// TODO(api): Replace direct repository calls with packages/api once the service layer is introduced to decouple web from db access.
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
