import { Request, Response, NextFunction } from 'express';
import { isAppError } from '../utils/errors';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isAppError(err)) {
    if (err.retryAfterSeconds && err.retryAfterSeconds > 0) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      retryAfterSeconds: err.retryAfterSeconds,
    });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined,
  });
}
