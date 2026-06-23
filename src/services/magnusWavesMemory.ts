import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { buildGateContextAppendix } from '../constants/blueprintFlow';
import { getBlueprintGate } from './blueprintGate';
import { getInitialForm } from './initialForm';
import { getActiveCycleIdLocal } from './cycleWorkspace';
import { getDiagnosticCycle } from './diagnosticCycles';
import { actionCanvasesApi, objectivesApi } from './api';
import type { ActionCanvas, Objective } from '../types';

export interface MagnusWavesMemoryMeta {
  diagnosticComplete: boolean;
  hasGate: boolean;
  gateLabel: string;
  actionCanvasTotal: number;
  actionCanvasClosed: number;
  objectivesCount: number;
}

export interface MagnusWavesMemory {
  context: string;
  diagnosticContext: string;
  gateContext: string;
  meta: MagnusWavesMemoryMeta;
  statusLabel: string;
  /** Compatível com DesignDiffusionContext */
  diagnosticComplete: boolean;
  selectedPath?: 'A' | 'B';
  gateSkipped: boolean;
  ready: boolean;
}

function formatCanvas(canvas: ActionCanvas): string {
  const lines: string[] = [
    `### ${canvas.nomeIniciativa || 'Sem nome'}${canvas.fechado ? ` [ENCERRADO · ${canvas.signOff?.toUpperCase()}]` : ''}`,
    `- Objetivo: ${canvas.objetivoEspecifico || '—'}`,
    `- Owner: ${canvas.owner || '—'} | Sponsor: ${canvas.sponsor || '—'} | Prazo: ${canvas.prazoFinal || '—'}`,
  ];
  const entregas = canvas.entregas?.filter((e) => e.entrega?.trim()) ?? [];
  if (entregas.length) {
    lines.push('- Entregas:');
    for (const e of entregas) {
      const st = e.status === 'verde' ? '🟢' : e.status === 'vermelho' ? '🔴' : '🟡';
      lines.push(`  - ${st} ${e.entrega} (${e.responsavel || '—'})`);
    }
  }
  const riscos = canvas.riscos?.filter((r) => r.risco?.trim()) ?? [];
  if (riscos.length) {
    lines.push('- Riscos:');
    for (const r of riscos) {
      lines.push(`  - ${r.risco} → ${r.acaoTomar || '—'}`);
    }
  }
  return lines.join('\n');
}

function formatObjectivesBrief(list: Objective[]): string {
  if (!list.length) return 'Nenhum objetivo cadastrado.';
  return list
    .slice(0, 20)
    .map((o) => `- [${o.status}] ${o.titulo} (${o.categoria})`)
    .join('\n');
}

export async function loadMagnusWavesMemory(userId: string): Promise<MagnusWavesMemory> {
  const activeCycleId = getActiveCycleIdLocal();
  const [{ data, completedAt }, gate, canvasesRaw, objectivesRaw, activeCycle] = await Promise.all([
    getInitialForm(userId),
    getBlueprintGate(userId).catch(() => null),
    actionCanvasesApi.list().catch(() => [] as ActionCanvas[]),
    objectivesApi.list().catch(() => [] as Objective[]),
    activeCycleId ? getDiagnosticCycle(activeCycleId).catch(() => null) : Promise.resolve(null),
  ]);

  const diagnosticComplete = Boolean(completedAt) || Boolean(activeCycle?.completedAt);
  const liveContext = buildDiagnosticContext(data);
  const cycleContext = activeCycle?.diagnosticContext?.trim() ?? '';
  const diagnosticContext = liveContext.trim() || cycleContext;
  const selectedPath = gate?.selectedPath;
  const gateSkipped = Boolean(gate?.skipped) && !selectedPath;
  const gateContext = selectedPath
    ? buildGateContextAppendix(selectedPath, {
        aiRecommendedPath: gate?.aiRecommendedPath,
        rationale: gate?.rationale,
      })
    : '';

  const canvases = Array.isArray(canvasesRaw) ? canvasesRaw : [];
  const objectives = Array.isArray(objectivesRaw) ? objectivesRaw : [];
  const closed = canvases.filter((c) => c.fechado);
  const open = canvases.filter((c) => !c.fechado);

  const statusLabel = diagnosticComplete
    ? 'Diagnóstico pronto — consultoria ativa'
    : 'Diagnóstico pendente';

  const sections: string[] = [
    '# Memória Magnus Waves (consultoria integrada)',
    activeCycle
      ? `## Ciclo ativo: ${activeCycle.label} (${activeCycle.status})`
      : 'Use diagnóstico, design e difusão como fonte única.',
    'Action Canvas encerrados são compromissos de execução deste ciclo.',
  ];

  if (diagnosticContext) {
    sections.push(diagnosticContext);
  }
  if (gateContext) {
    sections.push(gateContext);
  }

  if (canvases.length) {
    const block = [
      `## Difusão · Action Canvas (${canvases.length} total, ${closed.length} encerrados)`,
      closed.length
        ? '**Encerrados:**\n' + closed.map(formatCanvas).join('\n\n')
        : '',
      open.length ? '**Em andamento:**\n' + open.map(formatCanvas).join('\n\n') : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    sections.push(block);
  }

  if (objectives.length) {
    sections.push(`## Objetivos estratégicos (${objectives.length})\n${formatObjectivesBrief(objectives)}`);
  }

  if (diagnosticComplete) {
    sections.push(
      '## Instrução para objetivos de Difusão\nConverta diagnóstico + planos do Design + Action Canvas em objetivos 3.1 4 WS, 3.2 Imprint e 3.3 Follow-up. Cada objetivo deve citar a evidência em insightOrigem.'
    );
  }

  const context = sections.filter(Boolean).join('\n\n');

  return {
    context,
    diagnosticContext,
    gateContext,
    statusLabel,
    diagnosticComplete,
    selectedPath,
    gateSkipped,
    ready: diagnosticComplete,
    meta: {
      diagnosticComplete,
      hasGate: Boolean(selectedPath),
      gateLabel: statusLabel,
      actionCanvasTotal: canvases.length,
      actionCanvasClosed: closed.length,
      objectivesCount: objectives.length,
    },
  };
}
