export class FatalJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalJobError';
  }
}

export function isFatalJobError(error: unknown): error is FatalJobError {
  return error instanceof FatalJobError;
}
