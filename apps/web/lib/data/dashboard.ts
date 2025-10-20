import { getUserById } from '@muzo/db/repositories/user';
import { listOrdersByUser } from '@muzo/db/repositories/order';
import { listProjectsByUser } from '@muzo/db/repositories/project';
import { extractS3KeyFromUrl, getSignedS3ObjectUrl } from '../s3';

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

  const [projectsRaw, orders] = await Promise.all([
    listProjectsByUser(userRecord.id),
    listOrdersByUser(userRecord.id),
  ]);

  const projects = await Promise.all(
    projectsRaw.map(async (project) => {
      const outputs = await Promise.all(
        project.outputs.map(async (output) => {
          const metadata = (output.metadata ?? {}) as Record<string, unknown>;
          const metadataKey =
            metadata && typeof metadata === 'object' && 's3Key' in metadata && typeof metadata.s3Key === 'string'
              ? metadata.s3Key
              : null;
          const key = metadataKey ?? extractS3KeyFromUrl(output.url);

          if (!key) {
            return output;
          }

          try {
            const signedUrl = await getSignedS3ObjectUrl(key, { expiresIn: 3600 });
            return {
              ...output,
              url: signedUrl,
            };
          } catch {
            return output;
          }
        }),
      );

      let inputImageUrl = project.inputImageUrl;
      const inputKey = typeof project.inputImageUrl === 'string' ? extractS3KeyFromUrl(project.inputImageUrl) : null;

      if (inputKey) {
        try {
          inputImageUrl = await getSignedS3ObjectUrl(inputKey, { expiresIn: 3600 });
        } catch {
          inputImageUrl = project.inputImageUrl;
        }
      }

      return {
        ...project,
        inputImageUrl,
        outputs,
      };
    }),
  );

  return {
    user: userRecord,
    projects,
    orders,
  } as const;
}
