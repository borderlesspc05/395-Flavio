import type { DiagnosticFieldValue } from '../types';
import type { OrganizationalScanDefinition, OrganizationalScanId } from '../types/organizationalScans';

export function getScanFieldKeys(scan: OrganizationalScanDefinition): string[] {
  return scan.blocks.flatMap((block) => block.fields.map((field) => field.id));
}

export function isScanValueAnswered(value: DiagnosticFieldValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function isDistributionComplete(
  value: DiagnosticFieldValue | undefined,
  total: number,
): boolean {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value) as Record<string, number>;
    const sum = Object.values(parsed).reduce((acc, n) => acc + (Number(n) || 0), 0);
    return sum === total;
  } catch {
    return false;
  }
}

export function getScanCompletion(
  scan: OrganizationalScanDefinition,
  answers: Record<string, DiagnosticFieldValue>,
): { answered: number; total: number; percent: number } {
  const requiredFields = scan.blocks.flatMap((block) =>
    block.fields.filter((field) => field.required !== false),
  );
  const total = requiredFields.length;
  if (total === 0) return { answered: 0, total: 0, percent: 0 };

  const answered = requiredFields.filter((field) => {
    const value = answers[field.id];
    if (field.type === 'distribution') {
      return isDistributionComplete(value, field.distributionTotal ?? 100);
    }
    return isScanValueAnswered(value);
  }).length;

  return {
    answered,
    total,
    percent: Math.round((answered / total) * 100),
  };
}

export function getScanStatus(
  scan: OrganizationalScanDefinition,
  answers: Record<string, DiagnosticFieldValue>,
): 'not_started' | 'in_progress' | 'complete' {
  const { answered, total, percent } = getScanCompletion(scan, answers);
  if (total === 0 || answered === 0) return 'not_started';
  if (percent === 100) return 'complete';
  return 'in_progress';
}

export function getScanStatusLabel(status: ReturnType<typeof getScanStatus>): string {
  if (status === 'complete') return 'Concluído';
  if (status === 'in_progress') return 'Em andamento';
  return 'Não iniciado';
}

export function getActiveFocusedScans(
  scans: OrganizationalScanDefinition[],
  allAnswers: Partial<Record<OrganizationalScanId, Record<string, DiagnosticFieldValue>>>,
) {
  return scans
    .filter((scan) => scan.id !== 'fullScan' && !scan.comingSoon)
    .filter((scan) => getScanStatus(scan, allAnswers[scan.id] ?? {}) !== 'not_started');
}

export function getAllScansCompletion(
  scans: OrganizationalScanDefinition[],
  allAnswers: Partial<Record<OrganizationalScanId, Record<string, DiagnosticFieldValue>>>,
) {
  const answerable = scans.filter((scan) => scan.id !== 'fullScan' && !scan.comingSoon);
  const totals = answerable.map((scan) =>
    getScanCompletion(scan, allAnswers[scan.id] ?? {}),
  );
  const answered = totals.reduce((sum, item) => sum + item.answered, 0);
  const total = totals.reduce((sum, item) => sum + item.total, 0);
  return {
    answered,
    total,
    percent: total > 0 ? Math.round((answered / total) * 100) : 0,
    byScan: Object.fromEntries(
      answerable.map((scan, index) => [scan.id, totals[index]]),
    ) as Record<OrganizationalScanId, ReturnType<typeof getScanCompletion>>,
  };
}

export function parseDistributionValue(value: DiagnosticFieldValue | undefined): Record<string, number> {
  if (!value || typeof value !== 'string') return {};
  try {
    return JSON.parse(value) as Record<string, number>;
  } catch {
    return {};
  }
}

export function serializeDistributionValue(values: Record<string, number>): string {
  return JSON.stringify(values);
}

export function buildOrganizationalScanContext(
  scans: import('../types/organizationalScans').OrganizationalScanDefinition[],
  answers: Partial<Record<import('../types/organizationalScans').OrganizationalScanId, Record<string, DiagnosticFieldValue>>>,
): string {
  const lines: string[] = [];

  for (const scan of scans) {
    if (scan.id === 'fullScan' || scan.comingSoon) continue;
    const scanAnswers = answers[scan.id] ?? {};
    const scanLines: string[] = [];

    for (const block of scan.blocks) {
      for (const field of block.fields) {
        const raw = scanAnswers[field.id];
        if (!isScanValueAnswered(raw) && field.type !== 'distribution') continue;
        if (field.type === 'distribution' && !isDistributionComplete(raw, field.distributionTotal ?? 100)) {
          continue;
        }
        const formatted = Array.isArray(raw)
          ? raw.join(', ')
          : field.type === 'distribution'
            ? Object.entries(parseDistributionValue(raw))
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ')
            : String(raw);
        scanLines.push(`- ${field.prompt}: ${formatted}`);
      }
    }

    if (scanLines.length) {
      lines.push(`\n## ${scan.title}\n${scanLines.join('\n')}`);
    }
  }

  return lines.length ? `\n# Diagnóstico focado\n${lines.join('\n')}`.trim() : '';
}
