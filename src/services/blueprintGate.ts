import { doc, deleteField, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BlueprintPath } from '../constants/blueprintFlow';

const COLLECTION = 'blueprintGate';

export interface BlueprintGateDoc {
  selectedPath?: BlueprintPath;
  aiRecommendedPath?: BlueprintPath;
  rationale?: string;
  skipped?: boolean;
  confirmedAt?: Date | null;
}

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function getBlueprintGate(userId: string): Promise<BlueprintGateDoc | null> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const raw = snap.data();
  if (!raw) return null;
  const selected =
    raw.selectedPath === 'A' || raw.selectedPath === 'B' ? raw.selectedPath : undefined;
  const skipped = Boolean(raw.skipped);
  if (!selected && !skipped) return null;

  return {
    selectedPath: selected,
    aiRecommendedPath:
      raw.aiRecommendedPath === 'A' || raw.aiRecommendedPath === 'B'
        ? raw.aiRecommendedPath
        : undefined,
    rationale: typeof raw.rationale === 'string' ? raw.rationale : undefined,
    skipped,
    confirmedAt: toDate(raw.confirmedAt),
  };
}

export async function saveBlueprintGateSelection(
  userId: string,
  payload: {
    selectedPath: BlueprintPath;
    aiRecommendedPath?: BlueprintPath;
    rationale?: string;
  }
) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      selectedPath: payload.selectedPath,
      aiRecommendedPath: payload.aiRecommendedPath ?? null,
      rationale: payload.rationale ?? null,
      skipped: false,
      confirmedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveBlueprintGateSkipped(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      skipped: true,
      confirmedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function clearBlueprintGate(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      selectedPath: deleteField(),
      aiRecommendedPath: deleteField(),
      rationale: deleteField(),
      skipped: deleteField(),
      confirmedAt: deleteField(),
    },
    { merge: true }
  );
}
