import type { DiagnosticCycle } from '../services/diagnosticCycles';

export function isOpenCycleStatus(status: string): boolean {
  return status === 'draft' || status === 'active';
}

export function countOpenCycles(cycles: Pick<DiagnosticCycle, 'id' | 'status'>[]): number {
  return cycles.filter((c) => isOpenCycleStatus(c.status)).length;
}

/** Pode criar mais um ciclo? Limite = total de processos no plano (não só abertos). */
export function canCreateMoreCycles(
  cycles: Pick<DiagnosticCycle, 'id' | 'status'>[],
  maxCycles: number | null
): boolean {
  if (maxCycles === null) return true;
  return cycles.length < maxCycles;
}

/** @deprecated use canCreateMoreCycles — mantido para compatibilidade interna */
export function canCreateOpenCycle(
  cycles: Pick<DiagnosticCycle, 'id' | 'status'>[],
  maxOpenCycles: number | null,
  _archiveCycleId?: string
): boolean {
  return canCreateMoreCycles(cycles, maxOpenCycles);
}

export function formatMaxOpenCycles(limit: number | null): string {
  if (limit === null) return 'Processos de pré-diagnóstico ilimitados';
  if (limit === 1) return '1 processo de pré-diagnóstico';
  return `Até ${limit} processos de pré-diagnóstico`;
}

export function formatCycleUsage(count: number, max: number | null): string {
  if (max === null) return `${count} ${count === 1 ? 'processo' : 'processos'}`;
  return `${count} de ${max}`;
}

export function cycleLimitMessage(planName: string, maxCycles: number): string {
  if (maxCycles === 1) {
    return `Seu plano ${planName} permite apenas 1 processo de pré-diagnóstico. Faça upgrade para criar outro.`;
  }
  return `Seu plano ${planName} permite até ${maxCycles} processos de pré-diagnóstico. Faça upgrade para criar mais.`;
}
