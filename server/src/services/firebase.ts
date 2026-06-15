import admin from 'firebase-admin';
import { env } from '../config/env';

let initialized = false;
let useMemoryFallback = false;

export function isFirebaseEnabled(): boolean {
  return initialized && !useMemoryFallback;
}

export function initFirebase(): void {
  if (initialized) return;

  const { projectId, clientEmail, privateKey } = env.firebase;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: env.firebase.storageBucket,
      });
      initialized = true;
      console.log('[firebase] Initialized via GOOGLE_APPLICATION_CREDENTIALS');
      return;
    } catch (err) {
      console.warn('[firebase] applicationDefault failed:', err);
    }
  }

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: env.firebase.storageBucket,
      });
      initialized = true;
      console.log('[firebase] Initialized with service account env vars');
      return;
    } catch (err) {
      console.warn('[firebase] cert init failed:', err);
    }
  }

  useMemoryFallback = true;
  initialized = true;
  console.warn('[firebase] No credentials — using in-memory storage fallback');
}

export function getFirestore(): admin.firestore.Firestore | null {
  if (!initialized) initFirebase();
  if (useMemoryFallback) return null;
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth | null {
  if (!initialized) initFirebase();
  if (useMemoryFallback) return null;
  return admin.auth();
}
