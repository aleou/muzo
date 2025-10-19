import pino from 'pino';

export function createLogger(service: string) {
  // TODO(observability): Forward logs to central transport (Sentry/Otel) and add correlation ids per job/order.
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    name: 'muzo-' + service,
  });
}
