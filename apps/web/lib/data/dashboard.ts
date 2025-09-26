import { getFirstUser, getUserById, listOrdersByUser, listProjectsByUser } from '@muzo/db';

export async function getDashboardData(userId?: string) {
  const userRecord = userId ? await getUserById(userId) : await getFirstUser();

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
