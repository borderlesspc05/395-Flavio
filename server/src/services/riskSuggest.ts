import type { ActionCanvas, ActionCanvasRisk, RiskImpact, RiskProbability, RiskStatus } from '../types';
import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { generateId } from '../utils/id';

const MAX_SUGGEST = 3;

function defaultSuggestions(canvas: ActionCanvas): ActionCanvasRisk[] {
  const name = canvas.nomeIniciativa.trim() || 'esta iniciativa';
  return [
    {
      id: `risk-${generateId()}`,
      risco: `Desalinhamento entre áreas em ${name}`,
      acaoTomar: 'Checkpoint semanal com owners e sponsor',
      impacto: 'alto',
      probabilidade: 'media',
      responsavel: canvas.owner || '',
      status: 'em_andamento',
    },
    {
      id: `risk-${generateId()}`,
      risco: 'Resistência à mudança na equipe impactada',
      acaoTomar: 'Comunicação clara e treinamento prático',
      impacto: 'medio',
      probabilidade: 'alta',
      responsavel: canvas.owner || '',
      status: 'nao_iniciado',
    },
    {
      id: `risk-${generateId()}`,
      risco: 'Dependência de pessoas-chave sem cobertura',
      acaoTomar: 'Documentar processos e nomear backup',
      impacto: 'alto',
      probabilidade: 'media',
      responsavel: canvas.sponsor || canvas.owner || '',
      status: 'nao_iniciado',
    },
  ];
}

function normalizeImpact(value: unknown): RiskImpact {
  if (value === 'alto' || value === 'medio' || value === 'baixo') return value;
  return 'medio';
}

function normalizeProbability(value: unknown): RiskProbability {
  if (value === 'alta' || value === 'media' || value === 'baixa') return value;
  return 'media';
}

function normalizeStatus(value: unknown): RiskStatus {
  if (
    value === 'nao_iniciado' ||
    value === 'em_andamento' ||
    value === 'mitigado' ||
    value === 'monitorando'
  ) {
    return value;
  }
  return 'nao_iniciado';
}

function parseSuggestions(raw: string, canvas: ActionCanvas): ActionCanvasRisk[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return defaultSuggestions(canvas);
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return defaultSuggestions(canvas);
    return parsed.slice(0, MAX_SUGGEST).map((item, index) => {
      const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        id: `risk-${index}-${generateId()}`,
        risco: String(row.risco ?? '').trim() || `Risco ${index + 1}`,
        acaoTomar: String(row.acaoTomar ?? row.plano ?? '').trim() || 'Definir plano de mitigação',
        impacto: normalizeImpact(row.impacto),
        probabilidade: normalizeProbability(row.probabilidade),
        responsavel: String(row.responsavel ?? canvas.owner ?? '').trim(),
        status: normalizeStatus(row.status),
      };
    });
  } catch {
    return defaultSuggestions(canvas);
  }
}

/**
 * Sugere riscos editáveis para uma iniciativa da Difusão.
 */
export async function suggestRisksForCanvas(
  canvas: ActionCanvas
): Promise<{ risks: ActionCanvasRisk[]; demoMode?: boolean }> {
  const existing = canvas.riscos
    .filter((r) => r.risco.trim())
    .map((r) => `- ${r.risco} (plano: ${r.acaoTomar || '—'})`)
    .join('\n');

  const prompt = `Você é consultor de execução de mudanças organizacionais.
Sugira até ${MAX_SUGGEST} riscos concretos para a iniciativa abaixo.
Responda APENAS com um JSON array, sem markdown.

Cada item:
{"risco":"...","acaoTomar":"...","impacto":"alto|medio|baixo","probabilidade":"alta|media|baixa","responsavel":"...","status":"nao_iniciado|em_andamento|mitigado|monitorando"}

Iniciativa: ${canvas.nomeIniciativa || 'Sem nome'}
Objetivo: ${canvas.objetivoEspecifico || '—'}
Owner: ${canvas.owner || '—'}
Sponsor: ${canvas.sponsor || '—'}
Prazo: ${canvas.prazoFinal || '—'}
Riscos já mapeados:
${existing || '(nenhum)'}

Evite repetir riscos já listados. Use português do Brasil.`;

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'Responda só com JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });
    return { risks: parseSuggestions(raw, canvas) };
  } catch (err) {
    if (isLlmNotConfiguredError(err)) {
      return { risks: defaultSuggestions(canvas), demoMode: true };
    }
    throw err;
  }
}

/**
 * Gera texto de e-mail de reminder para um risco.
 */
export async function generateRiskReminderCopy(params: {
  canvas: ActionCanvas;
  risk: ActionCanvasRisk;
  assigneeName: string;
}): Promise<{ subject: string; text: string; html: string; demoMode?: boolean }> {
  const { canvas, risk, assigneeName } = params;
  const initiative = canvas.nomeIniciativa || 'Iniciativa';
  const risco = risk.risco || 'Risco';
  const plano = risk.acaoTomar || 'plano de mitigação';

  const fallback = {
    subject: `[Sprint] Lembrete: ${risco}`,
    text: `Olá, ${assigneeName},\n\nEste é um lembrete sobre o risco "${risco}" na iniciativa "${initiative}".\n\nPlano / ação a tomar: ${plano}\nImpacto: ${risk.impacto || 'a definir'}\nProbabilidade: ${risk.probabilidade || 'a definir'}\nStatus: ${risk.status || 'nao_iniciado'}\n\nPor favor, avance a mitigação e atualize o status no Sprint.\n`,
    html: `<p>Olá, <strong>${assigneeName}</strong>,</p><p>Este é um lembrete sobre o risco <strong>${risco}</strong> na iniciativa <strong>${initiative}</strong>.</p><p><strong>Plano / ação a tomar:</strong> ${plano}</p><p>Impacto: ${risk.impacto || 'a definir'} · Probabilidade: ${risk.probabilidade || 'a definir'} · Status: ${risk.status || 'nao_iniciado'}</p><p>Por favor, avance a mitigação e atualize o status no Sprint.</p>`,
  };

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        {
          role: 'system',
          content:
            'Você escreve e-mails curtos de lembrete profissional em português do Brasil. Responda só com JSON: {"subject":"...","body":"..."}',
        },
        {
          role: 'user',
          content: `Destinatário: ${assigneeName}
Iniciativa: ${initiative}
Risco: ${risco}
Plano: ${plano}
Impacto: ${risk.impacto || '—'}
Probabilidade: ${risk.probabilidade || '—'}
Status: ${risk.status || '—'}

Escreva um e-mail reforçando a responsabilidade pelo risco e pedindo avanço no plano. Tom direto e colaborativo, 2-4 frases no body.`,
        },
      ],
      temperature: 0.5,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as { subject?: string; body?: string };
    const subject = String(parsed.subject || '').trim() || fallback.subject;
    const body = String(parsed.body || '').trim() || fallback.text;
    return {
      subject,
      text: body,
      html: `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
    };
  } catch (err) {
    if (isLlmNotConfiguredError(err)) {
      return { ...fallback, demoMode: true };
    }
    return fallback;
  }
}
