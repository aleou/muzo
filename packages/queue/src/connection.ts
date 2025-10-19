import type { ConnectionOptions } from 'bullmq';

export function createRedisConnectionOptions(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const isSecure = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : undefined,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: isSecure ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
