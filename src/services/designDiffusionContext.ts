import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { buildGateContextAppendix, type BlueprintPath } from '../constants/blueprintFlow';
import { getBlueprintGate } from './blueprintGate';
import { getInitialForm } from './initialForm';

export interface DesignDiffusionContext {
  diagnosticComplete: boolean;
  selectedPath?: BlueprintPath;
  gateSkipped: boolean;
  ready: boolean;
  statusLabel: string;
  context: string;
}

export async function loadDesignDiffusionContext(userId: string): Promise<DesignDiffusionContext> {
  const [{ data, completedAt }, gate] = await Promise.all([
    getInitialForm(userId),
    getBlueprintGate(userId).catch(() => null),
  ]);

  const diagnosticComplete = Boolean(completedAt);
  const selectedPath = gate?.selectedPath;
  const gateSkipped = Boolean(gate?.skipped) && !selectedPath;
  const diagnosticContext = diagnosticComplete ? buildDiagnosticContext(data) : '';
  const gateContext = selectedPath
    ? buildGateContextAppendix(selectedPath, {
        aiRecommendedPath: gate?.aiRecommendedPath,
        rationale: gate?.rationale,
      })
    : '';

  const statusLabel = selectedPath
    ? `Design confirmado: Caminho ${selectedPath}`
    : gateSkipped
      ? 'Gate Zero adiado'
      : diagnosticComplete
        ? 'Diagnóstico pronto; Gate Zero pendente'
        : 'Diagnóstico pendente';

  const context = [
    '# Magnus Waves - Design para Difusão',
    'Converta o diagnóstico e o MM Blueprint em objetivos de Difusão (3.1 4 WS, 3.2 Imprint, 3.3 Follow-up).',
    'Cada objetivo deve nascer de uma evidência do diagnóstico ou da decisão do Gate Zero.',
    diagnosticContext,
    gateContext || '## Gate Zero\nAinda sem caminho confirmado. Sugira objetivos conservadores e sinalize dependencias do Design.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    diagnosticComplete,
    selectedPath,
    gateSkipped,
    ready: diagnosticComplete && Boolean(selectedPath),
    statusLabel,
    context,
  };
}
