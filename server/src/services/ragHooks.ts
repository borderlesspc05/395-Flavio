import { ActionCanvas, Objective, Report } from '../types';
import { getFirestore, isFirebaseEnabled } from './firebase';
import { indexRagDocument } from './ragIndex';
import {
  actionCanvasToRagDoc,
  domainWaveDataToRagDoc,
  initialFormToRagDoc,
  objectiveToRagDoc,
  reportToRagDoc,
} from './ragSources';

/** Indexação assíncrona — nunca propaga erro para o fluxo principal. */
function indexInBackground(label: string, fn: () => Promise<number>): void {
  void fn().catch((err) => {
    console.error(`[RAG] Failed to index ${label}:`, err);
  });
}

export function indexObjectiveAfterSave(objective: Objective): void {
  indexInBackground(`objectives/${objective.id}`, () =>
    indexRagDocument(objectiveToRagDoc(objective))
  );
}

export function indexActionCanvasAfterSave(canvas: ActionCanvas): void {
  indexInBackground(`actionCanvases/${canvas.id}`, () =>
    indexRagDocument(actionCanvasToRagDoc(canvas))
  );
}

export function indexReportAfterSave(report: Report): void {
  indexInBackground(`reports/${report.id}`, () => indexRagDocument(reportToRagDoc(report)));
}

export async function indexInitialFormForUser(userId: string): Promise<void> {
  if (!isFirebaseEnabled()) return;
  const db = getFirestore();
  if (!db) return;

  try {
    const snap = await db.collection('initialForms').doc(userId).get();
    if (!snap.exists) return;

    const form = { id: userId, userId, ...snap.data() } as Record<string, unknown> & {
      id: string;
      userId: string;
    };
    await indexRagDocument(initialFormToRagDoc(form));

    const domainDoc = domainWaveDataToRagDoc({
      userId,
      domainWaveData: form.domainWaveData,
      organizationId: form.organizationId as string | null,
    });
    if (domainDoc) {
      await indexRagDocument(domainDoc);
    }
  } catch (err) {
    console.error(`[RAG] Failed to index initialForms/${userId}:`, err);
  }
}

export function triggerInitialFormIndex(userId: string): void {
  indexInBackground(`initialForms/${userId}`, async () => {
    await indexInitialFormForUser(userId);
    return 1;
  });
}
