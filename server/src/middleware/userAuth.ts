import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { initFirebase, isFirebaseEnabled } from '../services/firebase';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userEmail?: string;
      userDisplayName?: string;
      firebaseToken?: admin.auth.DecodedIdToken;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

function applyDecodedUser(req: Request, decoded: admin.auth.DecodedIdToken): void {
  req.firebaseToken = decoded;
  req.userId = decoded.uid;
  req.userEmail = decoded.email?.trim().toLowerCase();
  req.userDisplayName =
    typeof decoded.name === 'string' && decoded.name.trim()
      ? decoded.name.trim()
      : decoded.email?.split('@')[0];
}

async function verifyUserToken(token: string): Promise<admin.auth.DecodedIdToken> {
  initFirebase();
  if (!isFirebaseEnabled()) {
    throw new AppError(503, 'Firebase não configurado para autenticação de usuários.');
  }
  return admin.auth().verifyIdToken(token);
}

export function initRequestAuthContext(req: Request, _res: Response, next: NextFunction): void {
  req.userId = '';
  req.userEmail = undefined;
  req.userDisplayName = undefined;
  req.firebaseToken = undefined;
  next();
}

export async function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError(401, 'Token de usuário obrigatório.');
    }

    const decoded = await verifyUserToken(token);
    applyDecodedUser(req, decoded);
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Token de usuário inválido ou expirado.'));
  }
}
