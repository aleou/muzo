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
    const { initQueues, shutdownQueues } = await import('./queues/init');
    await initQueues();
    logger.info('Worker bootstrapped and listening for jobs');

    let shuttingDown = false;
    const handleShutdown = async (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      logger.info({ signal }, 'Worker received shutdown signal, draining queues');
      try {
        await shutdownQueues();
        logger.info('Queues drained, exiting worker');
      } catch (error) {
        logger.error({ err: error }, 'Failed to shutdown queues gracefully');
      } finally {
        process.exit(0);
      }
    };

    process.once('SIGINT', handleShutdown);
    process.once('SIGTERM', handleShutdown);
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
