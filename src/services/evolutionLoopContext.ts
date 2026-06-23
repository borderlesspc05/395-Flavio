import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { buildGateContextAppendix } from '../constants/blueprintFlow';
import { getBlueprintGate } from './blueprintGate';
import { getInitialForm } from './initialForm';
import { parseDomainWaveData } from './domainWaveStorage';
import { buildDomainLearningsContext, computePlanMetrics, derivePlansFromWave3 } from '../utils/domainWave';
import { actionCanvasesApi, objectivesApi, reportsApi } from './api';
import type { InitialFormData, Objective } from '../types';

function summarizeCanvases(canvases: Awaited<ReturnType<typeof actionCanvasesApi.list>>) {
  const list = Array.isArray(canvases) ? canvases : [];
  if (list.length === 0) return 'Nenhum Action Canvas registrado.';
  return list
    .slice(0, 12)
    .map((c) => {
      const deliveries = c.entregas?.filter((e) => e.entrega?.trim()).length ?? 0;
      const done = c.entregas?.filter((e) => e.status === 'verde').length ?? 0;
      return `- ${c.nomeIniciativa}: owner ${c.owner ?? '—'}, entregas ${done}/${deliveries}, fechado=${c.fechado ? 'sim' : 'não'}`;
    })
    .join('\n');
}

function summarizeObjectives(objectives: Objective[] | { items?: Objective[] }) {
  const list = Array.isArray(objectives) ? objectives : objectives?.items ?? [];
  if (list.length === 0) return 'Nenhum objetivo na Difusão.';
  return list
    .slice(0, 12)
    .map((o) => `- ${o.titulo}: ${o.status ?? 'pendente'} | responsável ${o.responsavel ?? '—'}`)
    .join('\n');
}

function summarizeReports(reports: Awaited<ReturnType<typeof reportsApi.list>>) {
  const list = Array.isArray(reports) ? reports : [];
  if (list.length === 0) return 'Nenhum relatório MID gerado.';
  return list
    .slice(0, 3)
    .map((r) => `- ${r.title ?? r.titulo ?? 'Relatório'}: ${r.resumo ?? r.conteudo?.slice(0, 200) ?? '—'}`)
    .join('\n');
}

export async function buildEvolutionLoopContext(userId: string): Promise<string> {
  const [{ data, completedAt }, gate, canvases, objectives, reports] = await Promise.all([
    getInitialForm(userId),
    getBlueprintGate(userId).catch(() => null),
    actionCanvasesApi.list().catch(() => []),
    objectivesApi.list().catch(() => []),
    reportsApi.list().catch(() => []),
  ]);

  const diagnosticContext = buildDiagnosticContext(data);
  const gateBlock =
    gate?.selectedPath != null
      ? buildGateContextAppendix(gate.selectedPath, {
          aiRecommendedPath: gate.aiRecommendedPath,
          rationale: gate.rationale,
        })
      : '(Blueprint / Gate Zero não registrado)';

  const domainData = parseDomainWaveData(data.domainWaveData);
  const plans = derivePlansFromWave3(
    Array.isArray(canvases) ? canvases : [],
    Array.isArray(objectives) ? objectives : objectives?.items ?? []
  );
  const metrics = computePlanMetrics(plans);
  const domainBlock = buildDomainLearningsContext(plans, metrics, domainData);

  const sections = [
    '# Evolution Loop — contexto do ciclo',
    `Diagnóstico concluído: ${completedAt ? 'sim' : 'não'}`,
    '',
    '## Diagnóstico original',
    diagnosticContext.trim() || '(vazio)',
    '',
    '## Blueprint (Gate Zero / MM Blueprint)',
    gateBlock,
    '',
    '## Difusão — Action Canvas',
    summarizeCanvases(canvases),
    '',
    '## Difusão — Objetivos',
    summarizeObjectives(objectives),
    '',
    '## Domínio — resultados e aprendizados',
    domainBlock,
    '',
    '## Relatórios MID',
    summarizeReports(reports),
  ];

  return sections.join('\n');
}

export function appendEvolutionToFormData(
  data: InitialFormData,
  evolutionSummary: string
): InitialFormData {
  const marker = '\n\n--- Evolution Loop (próxima onda) ---\n';
  const current = String(data.desafioPrincipal ?? '').trim();
  if (current.includes('Evolution Loop (próxima onda)')) return data;
  return {
    ...data,
    desafioPrincipal: current
      ? `${current}${marker}${evolutionSummary}`
      : `Foco da próxima onda${marker}${evolutionSummary}`,
  };
}
