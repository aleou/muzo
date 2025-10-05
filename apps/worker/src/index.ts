import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createLogger } from './utils/logger';
import { WorkerEnvError } from './utils/env';

const workspaceEnv = resolve(process.cwd(), '../../.env');
config({ path: workspaceEnv, override: true });
config();

const logger = createLogger('worker');

async function bootstrap() {
  try {
    const { initQueues } = await import('./queues/init');
    await initQueues();
    logger.info('Worker bootstrapped and listening for jobs');
  } catch (error) {
    if (error instanceof WorkerEnvError && process.env.NODE_ENV !== 'production') {
      logger.warn({ issues: error.issues }, 'Worker env invalid, skipping worker startup in development');
      return;
    }

    logger.error({ err: error }, 'Worker failed to start');
    process.exit(1);
  }
}

bootstrap();