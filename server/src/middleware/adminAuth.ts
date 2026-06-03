import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { initFirebase, isFirebaseEnabled } from '../services/firebase';

declare global {
  namespace Express {
    interface Request {
      adminEmail?: string;
    }
  }
}

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Token de administrador obrigatório.');
    }

    const token = authHeader.slice(7);
    initFirebase();

    if (!isFirebaseEnabled()) {
      if (env.nodeEnv === 'development') {
        req.adminEmail = env.adminEmails[0];
        return next();
      }
      throw new AppError(503, 'Firebase não configurado para autenticação admin.');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email?.toLowerCase();

    if (!email || !env.adminEmails.includes(email)) {
      throw new AppError(403, 'Acesso restrito a administradores.');
    }

    req.adminEmail = email;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Token inválido ou expirado.'));
  }
}
