const RATE_LIMIT_REGEX = /max requests limit exceeded/i;

export function isRedisRateLimitError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (error instanceof Error) {
    return RATE_LIMIT_REGEX.test(error.message);
  }

  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string') {
      return RATE_LIMIT_REGEX.test(message);
    }
  }

  return false;
}
