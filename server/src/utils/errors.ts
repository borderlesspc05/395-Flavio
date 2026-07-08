export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
