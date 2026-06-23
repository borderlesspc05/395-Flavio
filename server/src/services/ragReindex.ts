import { ActionCanvas, ConsultantFramework, Objective, Report } from '../types';
import { COLLECTIONS } from '../config/env';
import { getFirestore, isFirebaseEnabled } from './firebase';
import { indexRagDocument } from './ragIndex';
import { isRagEnabled } from './ragConfig';
import {
  actionCanvasToRagDoc,
  domainWaveDataToRagDoc,
  frameworkToRagDoc,
  initialFormToRagDoc,
  objectiveToRagDoc,
  reportToRagDoc,
} from './ragSources';
import { listByUser, listFrameworks } from './storage';
import type { ReindexResult } from './ragTypes';

async function loadInitialForm(userId: string): Promise<Record<string, unknown> | null> {
  if (!isFirebaseEnabled()) return null;
  const db = getFirestore();
  if (!db) return null;

  try {
    const snap = await db.collection('initialForms').doc(userId).get();
    if (!snap.exists) return null;
    return { id: userId, userId, ...snap.data() } as Record<string, unknown>;
  } catch (err) {
    console.warn('[RAG] loadInitialForm failed:', err);
    return null;
  }
}

async function tryIndex(
  label: string,
  fn: () => Promise<number>
): Promise<{ indexed: number; error?: string }> {
  try {
    const indexed = await fn();
    return { indexed: indexed > 0 ? 1 : 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[RAG] Failed to index ${label}:`, err);
    return { indexed: 0, error: `${label}: ${message}` };
  }
}

export async function reindexUserCorpus(userId: string): Promise<ReindexResult> {
  const errors: string[] = [];
  let indexedDocuments = 0;

  if (!isRagEnabled()) {
    return {
      ok: true,
      userId,
      indexedDocuments: 0,
      errors: [],
      message: 'RAG vetorial desabilitado (RAG_ENABLED=false).',
      usedRag: false,
    };
  }

  const initialForm = await loadInitialForm(userId);
  if (initialForm) {
    const formDoc = initialForm as Record<string, unknown> & { id: string; userId: string };
    const result = await tryIndex('initialForms', () =>
      indexRagDocument(initialFormToRagDoc(formDoc))
    );
    indexedDocuments += result.indexed;
    if (result.error) errors.push(result.error);

    const domainDoc = domainWaveDataToRagDoc({
      userId,
      domainWaveData: formDoc.domainWaveData,
      organizationId: formDoc.organizationId as string | null,
    });
    if (domainDoc) {
      const domainResult = await tryIndex('domainWaveData', () => indexRagDocument(domainDoc));
      indexedDocuments += domainResult.indexed;
      if (domainResult.error) errors.push(domainResult.error);
    }
  }

  const [canvases, objectives, reports, frameworks] = await Promise.all([
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId),
    listByUser<Objective>(COLLECTIONS.objectives, userId),
    listByUser<Report>(COLLECTIONS.reports, userId),
    listFrameworks(userId),
  ]);

  for (const canvas of canvases) {
    const result = await tryIndex(`actionCanvases/${canvas.id}`, () =>
      indexRagDocument(actionCanvasToRagDoc(canvas))
    );
    indexedDocuments += result.indexed;
    if (result.error) errors.push(result.error);
  }

  for (const objective of objectives) {
    const result = await tryIndex(`objectives/${objective.id}`, () =>
      indexRagDocument(objectiveToRagDoc(objective))
    );
    indexedDocuments += result.indexed;
    if (result.error) errors.push(result.error);
  }

  for (const report of reports) {
    const result = await tryIndex(`reports/${report.id}`, () =>
      indexRagDocument(reportToRagDoc(report))
    );
    indexedDocuments += result.indexed;
    if (result.error) errors.push(result.error);
  }

  for (const fw of frameworks as ConsultantFramework[]) {
    const result = await tryIndex(`consultantFrameworks/${fw.id}`, () =>
      indexRagDocument(frameworkToRagDoc(fw, userId))
    );
    indexedDocuments += result.indexed;
    if (result.error) errors.push(result.error);
  }

  return {
    ok: errors.length === 0,
    userId,
    indexedDocuments,
    errors,
    message:
      indexedDocuments > 0
        ? 'Corpus RAG reindexado com sucesso.'
        : 'Nenhum documento indexado (verifique dados e configuração RAG).',
    usedRag: true,
  };
}
