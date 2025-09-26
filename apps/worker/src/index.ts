import 'dotenv/config';
import { initQueues } from './queues/init.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('worker');

async function bootstrap() {
  try {
    await initQueues();
    logger.info('Worker bootstrapped and listening for jobs');
  } catch (error) {
    logger.error({ err: error }, 'Worker failed to start');
    process.exit(1);
  }
}

bootstrap();
