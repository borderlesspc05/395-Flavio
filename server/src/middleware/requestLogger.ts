import { Request, Response, NextFunction } from 'express';
import { logApiRequest } from '../services/apiRequestLog';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api')) {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    void logApiRequest({
      userId: req.userId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}
