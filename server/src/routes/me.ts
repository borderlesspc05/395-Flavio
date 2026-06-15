import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { getById, COLLECTIONS } from '../services/storage';
import { parseProfilePhotoDataUrl, saveUserProfilePhoto } from '../services/profilePhoto';
import type { UserProfile } from '../services/users';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(400, 'userId é obrigatório.');

    const profile = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
    res.json({
      userId,
      email: profile?.email ?? '',
      displayName: profile?.displayName ?? '',
      photoURL: profile?.photoURL ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/photo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(400, 'userId é obrigatório.');

    const dataUrl = req.body?.dataUrl;
    if (typeof dataUrl !== 'string') {
      throw new AppError(400, 'dataUrl é obrigatório.');
    }

    const email = typeof req.body?.email === 'string' ? req.body.email : undefined;
    const { buffer, contentType } = parseProfilePhotoDataUrl(dataUrl);
    const photoURL = await saveUserProfilePhoto(userId, buffer, contentType, email);

    res.json({ ok: true, photoURL });
  } catch (err) {
    next(err);
  }
});

export default router;
