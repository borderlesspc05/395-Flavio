import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { profileApi } from './profileApi';
import {
  clearCachedProfilePhoto,
  prepareProfileImageDataUrl,
  writeCachedProfilePhoto,
} from '../utils/profileImage';

export type ProfilePhotoErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_TYPE'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_FAILED';

export class ProfilePhotoError extends Error {
  code: ProfilePhotoErrorCode;

  constructor(code: ProfilePhotoErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ProfilePhotoError('NOT_AUTHENTICATED');

  let dataUrl: string;
  try {
    dataUrl = await prepareProfileImageDataUrl(file);
  } catch {
    throw new ProfilePhotoError('INVALID_TYPE');
  }

  if (dataUrl.length > 7_000_000) {
    throw new ProfilePhotoError('FILE_TOO_LARGE');
  }

  try {
    const { photoURL } = await profileApi.uploadPhoto(dataUrl, user.email ?? undefined);

    writeCachedProfilePhoto(user.uid, photoURL);

    try {
      await updateProfile(user, { photoURL });
      await user.reload();
    } catch {
      /* Firestore/API já persistiu — Auth é complementar */
    }

    return photoURL;
  } catch (err) {
    if (err instanceof ProfilePhotoError) throw err;
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 400) throw new ProfilePhotoError('INVALID_TYPE');
    if (status === 413) throw new ProfilePhotoError('FILE_TOO_LARGE');
    throw new ProfilePhotoError('UPLOAD_FAILED');
  }
}

export function discardCachedProfilePhoto(userId: string) {
  clearCachedProfilePhoto(userId);
}
