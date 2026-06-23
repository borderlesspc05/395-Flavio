import { actionCanvasesApi, objectivesApi, reportsApi } from './api';
import type { DiagnosticCycle } from './diagnosticCycles';
import type { WaveId } from '../constants/magnusWaves';

export type CycleWaveStep = WaveId | 'inicio';

export function getCycleWaveFromDoc(cycle: DiagnosticCycle): CycleWaveStep {
  if (cycle.status === 'archived') return 'dominio';
  if (!cycle.completedAt) return 'diagnostico';
  if (!cycle.gatePath && !cycle.gateSummary?.trim()) return 'design';
  return 'difusao';
}

export function getRouteForWaveStep(step: CycleWaveStep): string {
  switch (step) {
    case 'diagnostico':
      return '/dashboard/scans';
    case 'design':
      return '/dashboard/design';
    case 'difusao':
      return '/dashboard/objetivos';
    case 'dominio':
      return '/dashboard/relatorios';
    case 'inicio':
    default:
      return '/dashboard/inicio';
  }
}

/** Rota síncrona a partir só do documento do ciclo (fallback). */
export function getRouteForCycleDoc(cycle: DiagnosticCycle): string {
  if (cycle.status === 'archived') return '/dashboard/historico';
  return getRouteForWaveStep(getCycleWaveFromDoc(cycle));
}

/**
 * Após ativar o ciclo no workspace, consulta dados escopados ao cycleId
 * e devolve a melhor rota de entrada no fluxo Magnus Waves.
 */
export async function resolveCycleEntryRoute(cycle: DiagnosticCycle): Promise<string> {
  if (cycle.status === 'archived') return '/dashboard/historico';
  if (!cycle.completedAt) return '/dashboard/scans';

  try {
    const [canvases, objectives, reports] = await Promise.all([
      actionCanvasesApi.list().catch(() => []),
      objectivesApi.list().catch(() => []),
      reportsApi.list().catch(() => []),
    ]);

    const canvasList = Array.isArray(canvases) ? canvases : [];
    const objList = Array.isArray(objectives) ? objectives : objectives?.items ?? [];
    const reportList = Array.isArray(reports) ? reports : [];

    if (reportList.length > 0) return '/dashboard/relatorios';
    if (objList.length > 0) return '/dashboard/objetivos';
    if (canvasList.length > 0) return '/dashboard/design';
    if (!cycle.gatePath && !cycle.gateSummary?.trim()) {
      return '/dashboard/minha-equipe?tab=consultoria';
    }
    return '/dashboard/design';
  } catch {
    return getRouteForCycleDoc(cycle);
  }
}

export const WAVE_STEP_LABELS: Record<CycleWaveStep, string> = {
  diagnostico: 'Diagnóstico',
  design: 'Design',
  difusao: 'Difusão',
  dominio: 'Domínio',
  inicio: 'Visão geral',
};
