import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import {
  createDiagnosticCycle,
  getDiagnosticCycle,
  snapshotFormIntoCycle,
  updateDiagnosticCycle,
  type DiagnosticCycle,
} from './diagnosticCycles';
import { getInitialForm, saveInitialFormDraft } from './initialForm';
import { setActiveCycleId } from './cycleWorkspace';
import { workspaceApi } from './api';
import { appendEvolutionToFormData } from './evolutionLoopContext';
import { stashEvolutionForDesign } from './evolutionLoopStorage';
import type { EvolutionLoopResult } from '../types/evolutionLoop';

export async function startDesignWaveFromEvolution(
  userId: string,
  activeCycle: DiagnosticCycle | null,
  evolution: EvolutionLoopResult
): Promise<{ ok: boolean; message?: string; cycleId?: string }> {
  try {
    if (activeCycle) {
      await snapshotFormIntoCycle(activeCycle.id, userId);
      const { data, completedAt } = await getInitialForm(userId);
      const diagnosticContext = buildDiagnosticContext(data);
      if (diagnosticContext.trim()) {
        await updateDiagnosticCycle(activeCycle.id, {
          status: 'archived',
          archivedAt: true,
          diagnosticContext,
          formData: data,
          ...(completedAt ? { completedAt: completedAt.toISOString() } : {}),
        });
        try {
          await workspaceApi.archiveCycle({
            cycleNumber: activeCycle.cycleNumber,
            label: activeCycle.label,
            diagnosticContext,
          });
        } catch {
          /* API offline */
        }
      }
    }

    const { data, completedAt } = await getInitialForm(userId);
    const evolutionNote = [
      evolution.nextWave.focus,
      evolution.nextWave.rationale,
      '',
      'Continuar:',
      ...evolution.continuar.map((p) => `• ${p.practice}`),
      '',
      'Ajustar:',
      ...evolution.ajustar.map((p) => `• ${p.practice}`),
    ].join('\n');

    const nextForm = appendEvolutionToFormData(data, evolutionNote);
    const focus = evolution.nextWave.focus.trim() || 'Nova onda';
    const label = `Onda 2 · ${focus}`;

    await workspaceApi.reset({
      objectives: true,
      actionCanvases: true,
      reports: false,
      conversations: false,
      magnusMemory: false,
    });

    const created = await createDiagnosticCycle(userId, {
      label,
      status: 'active',
      diagnosticContext: buildDiagnosticContext(nextForm),
      formData: nextForm,
    });

    await updateDiagnosticCycle(created.id, {
      completedAt: (completedAt ?? new Date()).toISOString(),
      status: 'active',
    });

    await saveInitialFormDraft(userId, nextForm);
    await setActiveCycleId(userId, created.id);
    stashEvolutionForDesign(evolution);

    const refreshed = await getDiagnosticCycle(created.id);
    return {
      ok: true,
      message: `Nova onda criada: ${label}`,
      cycleId: refreshed?.id ?? created.id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar nova onda';
    return { ok: false, message: msg };
  }
}
