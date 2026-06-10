import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createEmptyDiagnosticData, getAllDiagnosticFields, getFieldKeys } from '../constants/diagnosticFlow';
import { db } from '../config/firebase';
import type { DiagnosticFieldValue, InitialFormData } from '../types';
import { SELECTED_SOLUTION_ACTIONS_KEY } from '../types/solutionPick';

const PRESERVED_EXTENSION_KEYS = [
  SELECTED_SOLUTION_ACTIONS_KEY,
  'solucaoSelecionadaDesign',
  'solucoesPrioritarias',
] as const;

const COLLECTION = 'initialForms';

function normalizeFieldValue(raw: unknown, fallback: DiagnosticFieldValue): DiagnosticFieldValue {
  if (Array.isArray(fallback)) {
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  }
  if (Array.isArray(raw)) return raw.join(', ');
  return raw == null ? '' : String(raw);
}

function normalizeFormData(raw: Record<string, unknown> | undefined): InitialFormData {
  const empty = createEmptyDiagnosticData();
  if (!raw) return empty;

  const normalized = { ...empty };
  for (const field of getAllDiagnosticFields()) {
    for (const key of getFieldKeys(field)) {
      normalized[key] = normalizeFieldValue(raw[key], empty[key]);
    }
  }

  const result: InitialFormData = {
    ...normalized,
    organizacao: String(normalized.organizacao ?? ''),
    produtoServico: String(normalized.produtoServico ?? ''),
    estagioNegocio: String(normalized.estagioNegocio ?? ''),
    fatoresExternos: String(normalized.fatoresExternos ?? ''),
    mudancasRecentes: String(normalized.mudancasRecentes ?? ''),
  };

  if (raw) {
    for (const key of PRESERVED_EXTENSION_KEYS) {
      const value = raw[key];
      if (typeof value === 'string' && value.trim()) {
        result[key] = value;
      }
    }
  }

  return result;
}

export async function getInitialForm(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      data: createEmptyDiagnosticData(),
      completedAt: null as Date | null,
      draftUpdatedAt: null as Date | null,
    };
  }

  const raw = snap.data();
  const completedAt = raw.completedAt?.toDate?.() ?? null;
  const draftUpdatedAt = raw.draftUpdatedAt?.toDate?.() ?? raw.updatedAt?.toDate?.() ?? null;

  return {
    data: normalizeFormData(raw),
    completedAt,
    draftUpdatedAt,
  };
}

export async function saveInitialFormDraft(userId: string, data: InitialFormData) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      ...data,
      draftUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return new Date();
}

export async function clearInitialForm(userId: string) {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
  }
}

export async function saveInitialForm(userId: string, data: InitialFormData) {
  const ref = doc(db, COLLECTION, userId);
  await setDoc(
    ref,
    {
      ...data,
      completedAt: serverTimestamp(),
      draftUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return new Date();
}
