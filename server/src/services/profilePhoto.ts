import admin from 'firebase-admin';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { getAuth, isFirebaseEnabled } from './firebase';
import { getById, COLLECTIONS } from './storage';
import { upsertUserProfile, type UserProfile } from './users';

const MAX_BYTES = 5 * 1024 * 1024;

export function parseProfilePhotoDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new AppError(400, 'Imagem inválida. Envie JPEG ou PNG.');
  }
  const contentType = match[1].toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new AppError(400, 'Formato de imagem não suportado.');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) {
    throw new AppError(400, 'Imagem vazia.');
  }
  if (buffer.length > MAX_BYTES) {
    throw new AppError(400, 'A imagem deve ter no máximo 5 MB.');
  }
  return { buffer, contentType };
}

async function persistPhotoUrl(userId: string, photoURL: string, email?: string): Promise<string> {
  const auth = getAuth();
  if (auth) {
    try {
      await auth.updateUser(userId, { photoURL });
    } catch {
      /* Auth update opcional — Firestore é a fonte para o app */
    }
  }

  const existing = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
  await upsertUserProfile({
    userId,
    email: email ?? existing?.email,
    photoURL,
  });

  return photoURL;
}

export async function saveUserProfilePhoto(
  userId: string,
  buffer: Buffer,
  contentType: string,
  email?: string
): Promise<string> {
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const path = `profiles/${userId}/avatar.${ext}`;

  if (isFirebaseEnabled() && env.firebase.storageBucket) {
    try {
      const bucket = admin.storage().bucket(env.firebase.storageBucket);
      const file = bucket.file(path);
      await file.save(buffer, {
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000',
        },
        resumable: false,
      });

      let photoURL: string;
      try {
        await file.makePublic();
        photoURL = `https://storage.googleapis.com/${bucket.name}/${path}`;
      } catch {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: '03-01-2500',
        });
        photoURL = signedUrl;
      }

      return persistPhotoUrl(userId, photoURL, email);
    } catch {
      /* fallback abaixo */
    }
  }

  const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
  return persistPhotoUrl(userId, dataUrl, email);
}
