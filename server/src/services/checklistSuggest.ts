import type { ActionCanvas, ActionCanvasDelivery } from '../types';
import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { generateId } from '../utils/id';
import type { DeliveryChecklistItem } from './deliveryChecklist';
import { normalizeChecklistItems } from './deliveryChecklist';

function defaultActions(delivery: ActionCanvasDelivery): DeliveryChecklistItem[] {
  const base = delivery.entrega.trim() || 'esta entrega';
  const actions = [
    [`Mapear o contexto, as dependências e os envolvidos necessários para ${base}`, 'alta'],
    [`Definir escopo, limites e evidências de conclusão de ${base}`, 'critica'],
    ['Validar o plano de execução e o cronograma com o Sponsor', 'critica'],
    [`Preparar os recursos, materiais e responsáveis necessários para ${base}`, 'alta'],
    ['Comunicar o plano e os impactos às pessoas envolvidas', 'media'],
    [`Executar a primeira etapa operacional de ${base}`, 'alta'],
    ['Monitorar a adoção e corrigir desvios identificados durante a execução', 'alta'],
    ['Consolidar evidências e validar os resultados frente aos critérios de sucesso', 'critica'],
  ] as const;
  return actions.map(([texto, prioridade]) => ({
    id: `chk-${generateId()}`,
    texto,
    progresso: 0,
    responsavel: '',
    prazo: delivery.prazo || '',
    prioridade,
    done: false,
  }));
}

/**
 * Sugere 8 a 12 ações cronológicas e editáveis para o check-list da Execução.
 */
export async function suggestChecklistActions(params: {
  canvas: ActionCanvas;
  delivery: ActionCanvasDelivery;
}): Promise<{ items: DeliveryChecklistItem[]; demoMode?: boolean }> {
  const { canvas, delivery } = params;
  const existing = (delivery.checklistItems ?? [])
    .filter((i) => i.texto.trim())
    .map((i) => `- ${i.texto}`)
    .join('\n');

  const prompt = `Você é um gerente de projetos sênior e consultor de transformação organizacional.
Antes de escrever, analise internamente o problema, a transformação desejada, dependências, participantes, riscos e as evidências necessárias para cumprir os critérios de sucesso.

Crie entre 8 e 12 ações concretas para executar esta entrega. Use 8 para iniciativas simples, 10 para médias e 12 para complexas.

Regras:
- Use todo o contexto informado; nenhuma sugestão pode ignorá-lo.
- Organize em ordem cronológica natural, da preparação à validação e ao encerramento.
- Cada ação começa com verbo claro e representa uma entrega verificável.
- Evite frases vagas, redundâncias e nomes inventados.
- As ações devem conduzir aos critérios de sucesso sem copiá-los.
- Distribua prazos realistas, nunca posteriores ao prazo da entrega ou da iniciativa.
- Defina prioridade critica, alta, media ou baixa segundo impacto e dependências.

Responda APENAS com JSON array:
[{"texto":"ação específica","prazo":"YYYY-MM-DD","prioridade":"critica|alta|media|baixa"}]

Iniciativa: ${canvas.nomeIniciativa || '—'}
Objetivo: ${canvas.objetivoEspecifico || '—'}
Critérios de sucesso: ${canvas.successCriteria?.filter(Boolean).join(' | ') || 'não informados'}
Comentários da Mobilização: ${canvas.mobilizationNotes || 'não informados'}
Riscos: ${canvas.riscos?.map((risk) => `${risk.risco}: ${risk.acaoTomar}`).join(' | ') || 'não informados'}
Prazo final da iniciativa: ${canvas.prazoFinal || '—'}
Entrega: ${delivery.entrega || '—'}
Prazo da entrega: ${delivery.prazo || '—'}
Ações já listadas:
${existing || '(nenhuma)'}

Use português do Brasil. Seja específico e acionável.`;

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'Responda só com JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return { items: defaultActions(delivery), demoMode: true };
    const parsed = JSON.parse(match[0]) as unknown;
    const items = normalizeChecklistItems(
      Array.isArray(parsed)
        ? parsed.slice(0, 12).map((row) => {
            const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
            return {
              id: `chk-${generateId()}`,
              texto: String(r.texto ?? ''),
              progresso: 0,
              responsavel: '',
              prazo: String(r.prazo ?? delivery.prazo ?? ''),
              prioridade:
                r.prioridade === 'critica' ||
                r.prioridade === 'alta' ||
                r.prioridade === 'media' ||
                r.prioridade === 'baixa'
                  ? r.prioridade
                  : 'media',
              done: false,
            };
          })
        : []
    ).filter((i) => i.texto.trim());
    return { items: items.length >= 8 ? items : defaultActions(delivery) };
  } catch (err) {
    if (isLlmNotConfiguredError(err)) {
      return { items: defaultActions(delivery), demoMode: true };
    }
    throw err;
  }
}

export async function generateChecklistReminderCopy(params: {
  canvas: ActionCanvas;
  delivery: ActionCanvasDelivery;
  item: DeliveryChecklistItem;
  assigneeName: string;
}): Promise<{ subject: string; text: string; html: string; demoMode?: boolean }> {
  const { canvas, delivery, item, assigneeName } = params;
  const initiative = canvas.nomeIniciativa || 'Iniciativa';
  const task = item.texto || 'Tarefa';
  const prazo = item.prazo || delivery.prazo || 'a definir';
  const progresso = item.progresso ?? 0;

  const fallback = {
    subject: `[Sprint] Lembrete: ${task}`,
    text: `Olá, ${assigneeName},\n\nLembrete da tarefa pendente "${task}" na execução "${delivery.entrega || 'Entrega'}" (iniciativa "${initiative}").\n\nPrazo: ${prazo}\nProgresso atual: ${progresso}%\n\nPor favor, avance esta atividade e atualize o status no Sprint.\n`,
    html: `<p>Olá, <strong>${assigneeName}</strong>,</p><p>Lembrete da tarefa pendente <strong>${task}</strong> na execução <strong>${delivery.entrega || 'Entrega'}</strong> (iniciativa <strong>${initiative}</strong>).</p><p>Prazo: ${prazo} · Progresso: ${progresso}%</p><p>Por favor, avance esta atividade e atualize o status no Sprint.</p>`,
  };

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        {
          role: 'system',
          content:
            'Você escreve e-mails curtos de lembrete em português do Brasil. Responda só com JSON: {"subject":"...","body":"..."}',
        },
        {
          role: 'user',
          content: `Destinatário: ${assigneeName}
Iniciativa: ${initiative}
Execução: ${delivery.entrega || '—'}
Tarefa: ${task}
Prazo: ${prazo}
Progresso: ${progresso}%

Escreva um lembrete reforçando a atividade pendente e o prazo. Tom direto e colaborativo, 2-4 frases.`,
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
