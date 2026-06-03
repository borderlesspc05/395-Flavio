import { getFirestore, isFirebaseEnabled } from './firebase';
import { COLLECTIONS } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocData = Record<string, any>;

/** In-memory fallback when Firebase is unavailable */
const memoryStore = new Map<string, Map<string, DocData>>();

function memoryCollection(name: string): Map<string, DocData> {
  if (!memoryStore.has(name)) {
    memoryStore.set(name, new Map());
  }
  return memoryStore.get(name)!;
}

export async function listByUser<T>(
  collection: string,
  userId: string,
  orderField = 'createdAt'
): Promise<T[]> {
  const db = getFirestore();
  if (db && isFirebaseEnabled()) {
    const snap = await db
      .collection(collection)
      .where('userId', '==', userId)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
    return items.sort((a, b) =>
      String((b as DocData)[orderField] ?? '').localeCompare(String((a as DocData)[orderField] ?? ''))
    );
  }

  const col = memoryCollection(collection);
  return (Array.from(col.values())
    .filter((d) => d.userId === userId)
    .sort((a, b) =>
      String(b[orderField] ?? '').localeCompare(String(a[orderField] ?? ''))
    ) as unknown) as T[];
}

export async function getById<T>(
  collection: string,
  id: string
): Promise<T | null> {
  const db = getFirestore();
  if (db && isFirebaseEnabled()) {
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as unknown as T;
  }

  const col = memoryCollection(collection);
  const data = col.get(id);
  return data ? ({ ...data } as unknown as T) : null;
}

export async function create<T extends DocData>(
  collection: string,
  id: string,
  data: T
): Promise<T> {
  const db = getFirestore();
  const doc = { ...data, id };

  if (db && isFirebaseEnabled()) {
    await db.collection(collection).doc(id).set(data);
    return doc as T;
  }

  memoryCollection(collection).set(id, doc as DocData);
  return doc as T;
}

export async function update<T>(
  collection: string,
  id: string,
  patch: Partial<T>
): Promise<T | null> {
  const existing = await getById<T>(collection, id);
  if (!existing) return null;

  const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  const db = getFirestore();

  if (db && isFirebaseEnabled()) {
    const { id: _id, ...rest } = updated;
    await db.collection(collection).doc(id).update(rest as DocData);
    return updated;
  }

  memoryCollection(collection).set(id, updated as DocData);
  return updated;
}

export async function remove(collection: string, id: string): Promise<boolean> {
  const db = getFirestore();
  if (db && isFirebaseEnabled()) {
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) return false;
    await db.collection(collection).doc(id).delete();
    return true;
  }

  return memoryCollection(collection).delete(id);
}

export async function listAll<T>(collection: string, orderField = 'createdAt'): Promise<T[]> {
  const db = getFirestore();
  if (db && isFirebaseEnabled()) {
    const snap = await db.collection(collection).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
    return items.sort((a, b) =>
      String((b as DocData)[orderField] ?? '').localeCompare(String((a as DocData)[orderField] ?? ''))
    );
  }

  const col = memoryCollection(collection);
  return (Array.from(col.values()).sort((a, b) =>
    String(b[orderField] ?? '').localeCompare(String(a[orderField] ?? ''))
  ) as unknown) as T[];
}

/** List frameworks for RAG (global + user-specific) */
export async function listFrameworks(userId: string): Promise<DocData[]> {
  const db = getFirestore();
  const collection = COLLECTIONS.consultantFrameworks;

  if (db && isFirebaseEnabled()) {
    const snap = await db.collection(collection).limit(100).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as DocData))
      .filter((d) => !d.userId || d.userId === userId);
  }

  const col = memoryCollection(collection);
  return Array.from(col.values()).filter(
    (d) => !d.userId || d.userId === userId
  );
}

export { COLLECTIONS };
