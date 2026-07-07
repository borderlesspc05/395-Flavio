import type { BlueprintPath } from '../constants/blueprintFlow';
import { loadMagnusWavesMemory, type MagnusWavesMemoryMeta } from './magnusWavesMemory';

export interface DesignDiffusionContext {
  diagnosticComplete: boolean;
  selectedPath?: BlueprintPath;
  gateSkipped: boolean;
  ready: boolean;
  statusLabel: string;
  context: string;
  meta?: MagnusWavesMemoryMeta;
}

/** Contexto de Difusão = memória completa Sprint Waves (diagnóstico â†’ canvas â†’ objetivos) */
export async function loadDesignDiffusionContext(userId: string): Promise<DesignDiffusionContext> {
  const memory = await loadMagnusWavesMemory(userId);
  return {
    diagnosticComplete: memory.diagnosticComplete,
    selectedPath: memory.selectedPath,
    gateSkipped: memory.gateSkipped,
    ready: memory.ready,
    statusLabel: memory.statusLabel,
    context: memory.context,
    meta: memory.meta,
  };
}
