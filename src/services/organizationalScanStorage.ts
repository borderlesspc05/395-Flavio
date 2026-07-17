import type { DiagnosticFieldValue, InitialFormData } from '../types';
import type { OrganizationalScanAnswers, OrganizationalScanId } from '../types/organizationalScans';
import { createEmptyOrganizationalScanAnswers } from '../types/organizationalScans';

export const ORGANIZATIONAL_SCAN_DATA_KEY = 'organizationalScanData';
/** ISO timestamps keyed by scan id — only that scan is frozen after conclude. */
export const ORGANIZATIONAL_SCAN_COMPLETED_KEY = 'organizationalScanCompleted';

export type OrganizationalScanCompletedMap = Partial<Record<OrganizationalScanId, string>>;

export function parseOrganizationalScanData(raw: DiagnosticFieldValue | undefined): OrganizationalScanAnswers {
  const empty = createEmptyOrganizationalScanAnswers();
  if (!raw || typeof raw !== 'string' || !raw.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<OrganizationalScanAnswers>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

export function serializeOrganizationalScanData(data: OrganizationalScanAnswers): string {
  return JSON.stringify(data);
}

export function parseCompletedScans(raw: DiagnosticFieldValue | undefined): OrganizationalScanCompletedMap {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as OrganizationalScanCompletedMap;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: OrganizationalScanCompletedMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        next[key as OrganizationalScanId] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

export function serializeCompletedScans(map: OrganizationalScanCompletedMap): string {
  return JSON.stringify(map);
}

export function getCompletedScans(formData: InitialFormData): OrganizationalScanCompletedMap {
  return parseCompletedScans(formData[ORGANIZATIONAL_SCAN_COMPLETED_KEY]);
}

export function isScanMarkedCompleted(formData: InitialFormData, scanId: OrganizationalScanId): boolean {
  return Boolean(getCompletedScans(formData)[scanId]);
}

export function markScanCompleted(
  formData: InitialFormData,
  scanId: OrganizationalScanId,
  at: Date = new Date(),
): InitialFormData {
  const map = { ...getCompletedScans(formData), [scanId]: at.toISOString() };
  return {
    ...formData,
    [ORGANIZATIONAL_SCAN_COMPLETED_KEY]: serializeCompletedScans(map),
  };
}

export function clearScanCompleted(
  formData: InitialFormData,
  scanId: OrganizationalScanId,
): InitialFormData {
  const map = { ...getCompletedScans(formData) };
  delete map[scanId];
  return {
    ...formData,
    [ORGANIZATIONAL_SCAN_COMPLETED_KEY]: serializeCompletedScans(map),
  };
}

export function getScanAnswersFromForm(
  formData: InitialFormData,
  scanId: OrganizationalScanId,
): Record<string, DiagnosticFieldValue> {
  const all = parseOrganizationalScanData(formData[ORGANIZATIONAL_SCAN_DATA_KEY]);
  return all[scanId] ?? {};
}

export function mergeScanAnswer(
  formData: InitialFormData,
  scanId: OrganizationalScanId,
  fieldId: string,
  value: DiagnosticFieldValue,
): InitialFormData {
  const all = parseOrganizationalScanData(formData[ORGANIZATIONAL_SCAN_DATA_KEY]);
  const scanAnswers = { ...(all[scanId] ?? {}), [fieldId]: value };
  const next: OrganizationalScanAnswers = { ...all, [scanId]: scanAnswers };
  return {
    ...formData,
    [ORGANIZATIONAL_SCAN_DATA_KEY]: serializeOrganizationalScanData(next),
  };
}

export function mergeScanAnswers(
  formData: InitialFormData,
  scanId: OrganizationalScanId,
  answers: Record<string, DiagnosticFieldValue>,
): InitialFormData {
  const all = parseOrganizationalScanData(formData[ORGANIZATIONAL_SCAN_DATA_KEY]);
  const next: OrganizationalScanAnswers = {
    ...all,
    [scanId]: { ...(all[scanId] ?? {}), ...answers },
  };
  return {
    ...formData,
    [ORGANIZATIONAL_SCAN_DATA_KEY]: serializeOrganizationalScanData(next),
  };
}
