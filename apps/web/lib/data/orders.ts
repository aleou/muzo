import { listOrdersByUser, findOrderById } from '@muzo/db/repositories/order';
import { extractS3KeyFromUrl, getSignedS3ObjectUrl } from '../s3';

/**
 * Récupère les commandes d'un utilisateur et signe les URLs S3 des images
 */
export async function getOrdersWithSignedUrls(userId: string) {
  const orders = await listOrdersByUser(userId);

  return Promise.all(
    orders.map(async (order) => {
      // Signer les URLs des outputs du projet
      const outputs = await Promise.all(
        (order.project?.outputs || []).map(async (output) => {
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

      return {
        ...order,
        project: order.project
          ? {
              ...order.project,
              outputs,
            }
          : order.project,
      };
    }),
  );
}

/**
 * Récupère une commande par ID et signe les URLs S3 des images
 */
export async function getOrderWithSignedUrls(orderId: string) {
  const order = await findOrderById(orderId);

  if (!order) {
    return null;
  }

  // Signer les URLs des outputs du projet
  const outputs = await Promise.all(
    (order.project?.outputs || []).map(async (output) => {
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

  return {
    ...order,
    project: order.project
      ? {
          ...order.project,
          outputs,
        }
      : order.project,
  };
}
