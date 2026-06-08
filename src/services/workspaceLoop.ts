import { auth } from '../config/firebase';
import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { buildGateContextAppendix } from '../constants/blueprintFlow';
import { clearBlueprintGate, getBlueprintGate } from './blueprintGate';
import { archiveDiagnosticCycle } from './diagnosticCycles';
import { clearInitialForm, getInitialForm } from './initialForm';
import { workspaceApi } from './api';

export interface LoopResetSectors {
  objectives: boolean;
  actionCanvases: boolean;
  reports: boolean;
  conversations: boolean;
  magnusMemory: boolean;
}

export interface LoopResetResult {
  archived?: { cycleNumber: number; label: string };
  clearedDiagnostic: boolean;
  clearedGate: boolean;
  workspaceRemoved?: Record<string, number>;
}

async function buildArchiveContext(userId: string): Promise<{ diagnosticContext: string; gateSummary?: string }> {
  const [{ data, completedAt }, gate] = await Promise.all([
    getInitialForm(userId),
    getBlueprintGate(userId).catch(() => null),
  ]);
  const diagnosticContext = buildDiagnosticContext(data);
  if (!diagnosticContext.trim() && !completedAt) {
    return { diagnosticContext: '' };
  }
  const gateSummary =
    gate?.selectedPath != null
      ? buildGateContextAppendix(gate.selectedPath, {
          aiRecommendedPath: gate.aiRecommendedPath,
          rationale: gate.rationale,
        })
      : undefined;
  return { diagnosticContext, gateSummary };
}

export async function clearDiagnosticOnly(userId: string): Promise<void> {
  await clearInitialForm(userId);
}

export async function startNewDiagnosticCycle(
  userId: string,
  options: {
    archiveCurrent: boolean;
    clearGate: boolean;
    sectors?: Partial<LoopResetSectors>;
  }
): Promise<LoopResetResult> {
  const result: LoopResetResult = {
    clearedDiagnostic: false,
    clearedGate: false,
  };

  if (options.archiveCurrent) {
    const { diagnosticContext, gateSummary } = await buildArchiveContext(userId);
    if (diagnosticContext.trim()) {
      try {
        const archived = await archiveDiagnosticCycle(userId, { diagnosticContext, gateSummary });
        result.archived = archived;
        try {
          await workspaceApi.archiveCycle({
            cycleNumber: archived.cycleNumber,
            label: archived.label,
            diagnosticContext,
          });
        } catch {
          /* API offline — ciclo salvo no Firestore do cliente */
        }
      } catch {
        /* Sem permissão em diagnosticCycles — segue com limpeza local */
      }
    }
  }

  await clearInitialForm(userId);
  result.clearedDiagnostic = true;

  if (options.clearGate) {
    try {
      await clearBlueprintGate(userId);
      result.clearedGate = true;
    } catch {
      /* gate opcional */
    }
  }

  const sectors = options.sectors;
  if (sectors && Object.values(sectors).some(Boolean)) {
    const workspaceRemoved = await workspaceApi.reset({
      objectives: Boolean(sectors.objectives),
      actionCanvases: Boolean(sectors.actionCanvases),
      reports: Boolean(sectors.reports),
      conversations: Boolean(sectors.conversations),
      magnusMemory: Boolean(sectors.magnusMemory),
    });
    result.workspaceRemoved = workspaceRemoved.removed;
  }

  return result;
}

export async function resetWorkspaceSectors(sectors: LoopResetSectors): Promise<Record<string, number>> {
  const res = await workspaceApi.reset(sectors);
  return res.removed;
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}
