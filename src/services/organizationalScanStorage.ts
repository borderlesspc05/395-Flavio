import type { DiagnosticFieldValue, InitialFormData } from '../types';
import type { OrganizationalScanAnswers, OrganizationalScanId } from '../types/organizationalScans';
import { createEmptyOrganizationalScanAnswers } from '../types/organizationalScans';

export const ORGANIZATIONAL_SCAN_DATA_KEY = 'organizationalScanData';

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
