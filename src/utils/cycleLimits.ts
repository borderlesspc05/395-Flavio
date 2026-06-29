import type { DiagnosticCycle } from '../services/diagnosticCycles';

export function isOpenCycleStatus(status: string): boolean {
  return status === 'draft' || status === 'active';
}

export function countOpenCycles(cycles: Pick<DiagnosticCycle, 'id' | 'status'>[]): number {
  return cycles.filter((c) => isOpenCycleStatus(c.status)).length;
}

export function canCreateOpenCycle(
  cycles: Pick<DiagnosticCycle, 'id' | 'status'>[],
  maxOpenCycles: number | null,
  archiveCycleId?: string
): boolean {
  if (maxOpenCycles === null) return true;
  let open = countOpenCycles(cycles);
  if (archiveCycleId) {
    const target = cycles.find((c) => c.id === archiveCycleId);
    if (target && isOpenCycleStatus(target.status)) {
      open = Math.max(0, open - 1);
    }
  }
  return open < maxOpenCycles;
}

export function formatMaxOpenCycles(limit: number | null): string {
  if (limit === null) return 'Projetos ilimitados';
  if (limit === 1) return '1 projeto ativo';
  return `${limit} projetos ativos`;
}

export function cycleLimitMessage(planName: string, maxOpen: number): string {
  if (maxOpen === 1) {
    return `Seu plano ${planName} permite apenas 1 projeto ativo. Arquive o projeto atual ou faça upgrade.`;
  }
  return `Seu plano ${planName} permite até ${maxOpen} projetos ativos. Arquive um projeto ou faça upgrade.`;
}
