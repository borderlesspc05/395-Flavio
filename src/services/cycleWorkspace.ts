import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'userWorkspace';
const LS_KEY = 'mm.activeCycleId';

export function getActiveCycleIdLocal(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LS_KEY);
}

export function setActiveCycleIdLocal(cycleId: string | null) {
  if (typeof window === 'undefined') return;
  if (cycleId) window.localStorage.setItem(LS_KEY, cycleId);
  else window.localStorage.removeItem(LS_KEY);
}

export async function getActiveCycleIdRemote(userId: string): Promise<string | null> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const id = snap.data()?.activeCycleId;
  return typeof id === 'string' ? id : null;
}

export async function setActiveCycleId(userId: string, cycleId: string): Promise<void> {
  setActiveCycleIdLocal(cycleId);
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    { activeCycleId: cycleId, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function resolveActiveCycleId(userId: string): Promise<string | null> {
  const local = getActiveCycleIdLocal();
  if (local) return local;
  const remote = await getActiveCycleIdRemote(userId);
  if (remote) setActiveCycleIdLocal(remote);
  return remote;
}
