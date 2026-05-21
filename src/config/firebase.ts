import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/** Configuração do projeto magnusmind-d42ec (Firebase Web SDK v11) */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCTEZOOpmmtrKXSJ3A5cAD49xD9Fa0OD9A',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'magnusmind-d42ec.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'magnusmind-d42ec',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'magnusmind-d42ec.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '981919789399',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:981919789399:web:46f31e0ad8e164f54e8e12',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-5QHZ9D7E9V',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let analyticsInstance: Analytics | null = null;

/** Inicializa Google Analytics (apenas no browser, quando suportado). */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  if (typeof window === 'undefined') return null;
  try {
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
    }
  } catch {
    /* Analytics opcional — não bloqueia o app */
  }
  return analyticsInstance;
}

export function getFirebaseProjectId(): string {
  return firebaseConfig.projectId;
}
