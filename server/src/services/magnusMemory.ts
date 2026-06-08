import { ActionCanvas, Objective } from '../types';
import { getFirestore } from './firebase';
import { COLLECTIONS } from '../config/env';
import { getById, listByUser, create, update } from './storage';
import { nowIso } from '../utils/id';

export const MAGNUS_MEMORY_COLLECTION = 'magnusMemory';

export interface MagnusMemorySnapshot {
  id: string;
  userId: string;
  diagnosticContext?: string;
  gateContext?: string;
  cycleHistory?: string[];
  diagnosticUpdatedAt?: string;
  gateUpdatedAt?: string;
  updatedAt: string;
}

export const MAGNUS_MEMORY_SYSTEM_PREAMBLE = `Trate o bloco abaixo como MEMÓRIA PERSISTENTE do cliente no método Magnus Waves.
- Priorize evidências do diagnóstico (1.1–1.5) antes de inferir.
- Conecte recomendações ao Gate Zero / MM Blueprint quando existir.
- Action Canvas encerrados são compromissos de execução já assumidos — não contradiga sem justificar.
- Objetivos listados já estão no portfólio; evite duplicar e proponha encadeamento.
- Se faltar dado crítico, diga o que falta e o que fazer agora (não invente).`;

function pickLonger(a?: string, b?: string): string | undefined {
  const ta = a?.trim() ?? '';
  const tb = b?.trim() ?? '';
  if (!ta && !tb) return undefined;
  if (ta.length >= tb.length) return ta;
  return tb;
}

export async function upsertMagnusMemorySnapshot(
  userId: string,
  patch: Partial<Pick<MagnusMemorySnapshot, 'diagnosticContext' | 'gateContext'>>
): Promise<MagnusMemorySnapshot> {
  const existing = await getById<MagnusMemorySnapshot>(MAGNUS_MEMORY_COLLECTION, userId);
  const now = nowIso();
  const next: MagnusMemorySnapshot = {
    id: userId,
    userId,
    diagnosticContext: patch.diagnosticContext ?? existing?.diagnosticContext,
    gateContext: patch.gateContext ?? existing?.gateContext,
    diagnosticUpdatedAt:
      patch.diagnosticContext != null ? now : existing?.diagnosticUpdatedAt,
    gateUpdatedAt: patch.gateContext != null ? now : existing?.gateUpdatedAt,
    updatedAt: now,
  };

  if (existing) {
    await update(MAGNUS_MEMORY_COLLECTION, userId, next as unknown as Record<string, unknown>);
  } else {
    await create(MAGNUS_MEMORY_COLLECTION, userId, next as unknown as Record<string, unknown>);
  }
  return next;
}

async function loadFirestoreDiagnosticText(userId: string): Promise<string | undefined> {
  const db = getFirestore();
  if (!db) return undefined;

  try {
    const formSnap = await db.collection('initialForms').doc(userId).get();
    if (!formSnap.exists) return undefined;
    const raw = formSnap.data();
    if (!raw || typeof raw !== 'object') return undefined;

    const lines: string[] = ['# Magnus Waves - Diagnóstico (Firestore)'];
    const skip = new Set(['completedAt', 'draftUpdatedAt', 'updatedAt']);
    for (const [key, value] of Object.entries(raw)) {
      if (skip.has(key)) continue;
      if (value == null || value === '') continue;
      const text = Array.isArray(value) ? value.join(', ') : String(value);
      if (text.trim()) lines.push(`- ${key}: ${text.trim()}`);
    }
    return lines.length > 1 ? lines.join('\n') : undefined;
  } catch (err) {
    console.warn('[magnusMemory] Firestore initialForms read failed:', err);
    return undefined;
  }
}

export function formatActionCanvasForMemory(canvas: ActionCanvas): string {
  const lines: string[] = [
    `### ${canvas.nomeIniciativa || 'Sem nome'}${canvas.fechado ? ` [ENCERRADO · Sign-off ${canvas.signOff?.toUpperCase()}]` : ' [em andamento]'}`,
    `- Objetivo: ${canvas.objetivoEspecifico || '—'}`,
    `- Owner: ${canvas.owner || '—'} | Sponsor: ${canvas.sponsor || '—'} | Prazo final: ${canvas.prazoFinal || '—'}`,
  ];

  const entregas = canvas.entregas.filter((e) => e.entrega.trim());
  if (entregas.length) {
    lines.push('- Entregas:');
    for (const e of entregas) {
      const st = e.status === 'verde' ? '🟢' : e.status === 'vermelho' ? '🔴' : '🟡';
      lines.push(
        `  - ${st} ${e.entrega} (${e.responsavel || 'sem responsável'}, prazo ${e.prazo || '—'})${e.evidencia ? ` · Evidência: ${e.evidencia}` : ''}`
      );
    }
  }

  const riscos = canvas.riscos.filter((r) => r.risco.trim());
  if (riscos.length) {
    lines.push('- Riscos:');
    for (const r of riscos) {
      lines.push(`  - ${r.risco} → Ação: ${r.acaoTomar || '—'}`);
    }
  }

  return lines.join('\n');
}

export function formatObjectivesForMemory(objectives: Objective[]): string {
  if (!objectives.length) return 'Nenhum objetivo estratégico cadastrado ainda.';
  const lines = objectives.slice(0, 24).map((o) => {
    const st =
      o.status === 'concluido' ? 'concluído' : o.status === 'em_andamento' ? 'em andamento' : o.status;
    return `- [${st}] ${o.titulo} (${o.categoria})${o.responsavel ? ` · ${o.responsavel}` : ''}${o.insightOrigem ? ` · Origem: ${o.insightOrigem}` : ''}`;
  });
  if (objectives.length > 24) {
    lines.push(`- … e mais ${objectives.length - 24} objetivos`);
  }
  return lines.join('\n');
}

export async function buildMagnusWavesMemoryContext(
  userId: string,
  clientOverride?: { diagnosticContext?: string; gateContext?: string }
): Promise<string> {
  const [snapshot, canvases, objectives, firestoreDiag] = await Promise.all([
    getById<MagnusMemorySnapshot>(MAGNUS_MEMORY_COLLECTION, userId),
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId),
    listByUser<Objective>(COLLECTIONS.objectives, userId),
    loadFirestoreDiagnosticText(userId),
  ]);

  const diagnostic = pickLonger(
    clientOverride?.diagnosticContext,
    pickLonger(snapshot?.diagnosticContext, firestoreDiag)
  );
  const gate = pickLonger(clientOverride?.gateContext, snapshot?.gateContext);

  const closed = canvases.filter((c) => c.fechado);
  const open = canvases.filter((c) => !c.fechado);

  const sections: string[] = [];

  if (diagnostic) {
    sections.push(`## Diagnóstico Magnus Waves (1.1–1.5)\n${diagnostic}`);
  } else {
    sections.push(
      '## Diagnóstico Magnus Waves\n*(ainda não sincronizado — peça ao usuário completar o diagnóstico na Onda 1)*'
    );
  }

  if (gate) {
    sections.push(`## Design · Gate Zero / MM Blueprint\n${gate}`);
  }

  if (canvases.length) {
    const canvasBlock = [
      `## Difusão · Action Canvas (${canvases.length} total, ${closed.length} encerrados)`,
      closed.length
        ? '**Encerrados (MID / memória de execução):**\n' +
          closed.map(formatActionCanvasForMemory).join('\n\n')
        : '',
      open.length
        ? '**Em andamento:**\n' + open.map(formatActionCanvasForMemory).join('\n\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    sections.push(canvasBlock);
  }

  if (objectives.length) {
    sections.push(
      `## Objetivos estratégicos (${objectives.length})\n${formatObjectivesForMemory(objectives)}`
    );
  }

  const history = snapshot?.cycleHistory?.filter((h) => h.trim()) ?? [];
  if (history.length) {
    sections.push(
      `## Histórico de ciclos de diagnóstico (${history.length} arquivados)\nUse como memória longitudinal — o ciclo atual está acima.\n\n${history.join('\n\n')}`
    );
  }

  return sections.join('\n\n');
}
