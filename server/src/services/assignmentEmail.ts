import { sendEmail, isEmailConfigured } from './email';
import type { ActionCanvas, ActionCanvasDelivery, ActionCanvasRisk, TeamMember } from '../types';
import { COLLECTIONS, listByUser } from './storage';
import { generateRiskReminderCopy } from './riskSuggest';
import { generateChecklistReminderCopy } from './checklistSuggest';
import {
  checklistItemsEqual,
  type DeliveryChecklistItem,
} from './deliveryChecklist';
import {
  assigneeMatchesMember,
  buildMemberPortalUrl,
  ensureMemberPortalToken,
} from './memberPortal';

async function findTeamMemberByAssignee(
  userId: string,
  responsavel: string
): Promise<TeamMember | null> {
  const trimmed = (responsavel || '').trim();
  if (!trimmed) return null;
  const members = await listByUser<TeamMember>(COLLECTIONS.teamMembers, userId);
  return members.find((m) => assigneeMatchesMember(trimmed, m)) ?? null;
}

async function resolvePortalLink(
  userId: string,
  responsavel: string
): Promise<string | null> {
  const match = await findTeamMemberByAssignee(userId, responsavel);
  if (!match) return null;
  const ensured = await ensureMemberPortalToken(match);
  return buildMemberPortalUrl(ensured);
}

function portalCta(url: string | null): { text: string; html: string } {
  if (!url) {
    return {
      text: '\nAcesse o link enviado pelo gestor para ver só as suas ações.\n',
      html: `<p>Peça ao gestor o link do seu portal para ver e atualizar só as suas ações.</p>`,
    };
  }
  return {
    text: `\nAbra seu portal (só as suas ações):\n${url}\n`,
    html: `<p><a href="${url}" style="color:#8a7358;font-weight:700">Abrir meu portal de ações</a></p><p style="font-size:12px;color:#666">Você verá apenas o que foi atribuído a você.</p>`,
  };
}
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isRolePlaceholder(value: string): boolean {
  const n = value.trim().toLowerCase();
  return (
    !n ||
    n === 'owner' ||
    n === 'sponsor' ||
    n === 'equipe núcleo' ||
    n === 'equipe nucleo' ||
    n === 'líder da iniciativa' ||
    n === 'lider da iniciativa'
  );
}

/**
 * Resolve e-mail a partir de valor digitado (e-mail literal) ou nome na equipe.
 */
export async function resolveAssigneeEmail(
  userId: string,
  responsavel: string
): Promise<{ email: string | null; displayName: string; matchedMember: boolean }> {
  const trimmed = (responsavel || '').trim();
  if (!trimmed) return { email: null, displayName: '', matchedMember: false };

  const emailMatch = trimmed.match(/[^\s<>]+@[^\s<>]+/);
  if (emailMatch) {
    const member = await findTeamMemberByAssignee(userId, emailMatch[0]);
    return {
      email: emailMatch[0],
      displayName: member?.nome || trimmed,
      matchedMember: Boolean(member),
    };
  }
  if (looksLikeEmail(trimmed)) {
    const member = await findTeamMemberByAssignee(userId, trimmed);
    return {
      email: trimmed,
      displayName: member?.nome || trimmed,
      matchedMember: Boolean(member),
    };
  }

  const match = await findTeamMemberByAssignee(userId, trimmed);
  if (match?.email?.trim()) {
    return {
      email: match.email.trim(),
      displayName: match.nome || trimmed,
      matchedMember: true,
    };
  }
  // Membro encontrado sem e-mail cadastrado
  if (match) {
    return { email: null, displayName: match.nome || trimmed, matchedMember: true };
  }
  return { email: null, displayName: trimmed, matchedMember: false };
}

/**
 * Notifica o Sponsor quando o campo muda em uma entrega (Execução).
 */
export async function notifyAssignmentIfNeeded(params: {
  canvas: ActionCanvas;
  previous: ActionCanvas;
  deliveryId: string;
}): Promise<{ sent: boolean; demoMode?: boolean }> {
  const { canvas, previous, deliveryId } = params;
  const next = canvas.entregas.find((e) => e.id === deliveryId);
  const prev = previous.entregas.find((e) => e.id === deliveryId);
  if (!next) return { sent: false };

  const sponsor = (next.responsavel || '').trim();
  const prevSponsor = (prev?.responsavel || '').trim();
  if (!sponsor || sponsor === prevSponsor) return { sent: false };
  if (isRolePlaceholder(sponsor)) return { sent: false };

  const { email: to, displayName } = await resolveAssigneeEmail(canvas.userId, sponsor);
  if (!to) return { sent: false };

  if (!isEmailConfigured()) {
    return { sent: false, demoMode: true };
  }

  const initiative = canvas.nomeIniciativa || 'Iniciativa';
  const entrega = next.entrega || 'Entrega';
  const portalUrl = await resolvePortalLink(canvas.userId, sponsor);
  const cta = portalCta(portalUrl);
  const result = await sendEmail({
    to,
    subject: `[Sprint] Você é Sponsor: ${entrega}`,
    text: `Olá, ${displayName || sponsor},\n\nVocê foi definido como Sponsor da execução "${entrega}" na iniciativa "${initiative}".\n\nComo Sponsor, você receberá atualizações por e-mail sempre que esta execução for alterada.\n\nPrazo: ${next.prazo || 'a definir'}.\nStatus: ${next.status || '—'}.${cta.text}`,
    html: `<p>Olá, <strong>${displayName || sponsor}</strong>,</p><p>Você foi definido como <strong>Sponsor</strong> da execução <strong>${entrega}</strong> na iniciativa <strong>${initiative}</strong>.</p><p>Como Sponsor, você receberá atualizações por e-mail sempre que esta execução for alterada.</p><p>Prazo: ${next.prazo || 'a definir'} · Status: ${next.status || '—'}</p>${cta.html}`,
  });

  return { sent: result.ok, demoMode: result.demoMode };
}

function deliveryContentChanged(prev: ActionCanvasDelivery, next: ActionCanvasDelivery): boolean {
  return (
    prev.entrega !== next.entrega ||
    prev.prazo !== next.prazo ||
    prev.status !== next.status ||
    !checklistItemsEqual(prev.checklistItems, next.checklistItems)
  );
}

/**
 * Notifica o Sponsor quando a Execução é atualizada (sem mudança de Sponsor).
 */
export async function notifySponsorDeliveryUpdateIfNeeded(params: {
  canvas: ActionCanvas;
  previous: ActionCanvas;
  deliveryId: string;
}): Promise<{ sent: boolean; demoMode?: boolean }> {
  const { canvas, previous, deliveryId } = params;
  const next = canvas.entregas.find((e) => e.id === deliveryId);
  const prev = previous.entregas.find((e) => e.id === deliveryId);
  if (!next || !prev) return { sent: false };

  const sponsor = (next.responsavel || '').trim();
  if (!sponsor || isRolePlaceholder(sponsor)) return { sent: false };
  if ((prev.responsavel || '').trim() !== sponsor) return { sent: false };
  if (!deliveryContentChanged(prev, next)) return { sent: false };

  const { email: to, displayName } = await resolveAssigneeEmail(canvas.userId, sponsor);
  if (!to) return { sent: false };

  if (!isEmailConfigured()) {
    return { sent: false, demoMode: true };
  }

  const initiative = canvas.nomeIniciativa || 'Iniciativa';
  const entrega = next.entrega || 'Entrega';
  const checklist = (next.checklistItems ?? []).filter((i) => i.texto.trim());
  const checklistBlock =
    checklist.length > 0
      ? `\nCheck-list:\n${checklist
          .map(
            (item) =>
              `• ${item.texto} (${item.progresso ?? 0}%) — ${item.responsavel || 'sem responsável'}`
          )
          .join('\n')}\n`
      : '';

  const portalUrl = await resolvePortalLink(canvas.userId, sponsor);
  const cta = portalCta(portalUrl);

  const result = await sendEmail({
    to,
    subject: `[Sprint] Atualização na execução: ${entrega}`,
    text: `Olá, ${displayName || sponsor},\n\nHouve uma atualização na execução "${entrega}" (iniciativa "${initiative}"), da qual você é Sponsor.\n\nStatus: ${next.status || '—'}\nPrazo: ${next.prazo || 'a definir'}${checklistBlock}${cta.text}`,
    html: `<p>Olá, <strong>${displayName || sponsor}</strong>,</p><p>Houve uma atualização na execução <strong>${entrega}</strong> (iniciativa <strong>${initiative}</strong>), da qual você é <strong>Sponsor</strong>.</p><ul><li><strong>Status:</strong> ${next.status || '—'}</li><li><strong>Prazo:</strong> ${next.prazo || 'a definir'}</li></ul>${
      checklist.length
        ? `<p><strong>Check-list</strong></p><ul>${checklist
            .map(
              (item) =>
                `<li>${item.texto} — ${item.progresso ?? 0}% · ${item.responsavel || 'sem responsável'}</li>`
            )
            .join('')}</ul>`
        : ''
    }${cta.html}`,
  });

  return { sent: result.ok, demoMode: result.demoMode };
}

/**
 * Notifica membros do check-list quando são assignados a uma ação.
 */
export async function notifyChecklistAssignmentIfNeeded(params: {
  canvas: ActionCanvas;
  previous: ActionCanvas;
  deliveryId: string;
}): Promise<{ sent: number }> {
  const { canvas, previous, deliveryId } = params;
  const next = canvas.entregas.find((e) => e.id === deliveryId);
  const prev = previous.entregas.find((e) => e.id === deliveryId);
  if (!next) return { sent: 0 };

  const prevById = new Map((prev?.checklistItems ?? []).map((i) => [i.id, i]));
  let sent = 0;

  for (const item of next.checklistItems ?? []) {
    const responsavel = (item.responsavel || '').trim();
    if (!responsavel || isRolePlaceholder(responsavel) || !item.texto.trim()) continue;
    const before = prevById.get(item.id);
    if ((before?.responsavel || '').trim() === responsavel) continue;

    const { email: to, displayName } = await resolveAssigneeEmail(canvas.userId, responsavel);
    if (!to || !isEmailConfigured()) continue;

    const portalUrl = await resolvePortalLink(canvas.userId, responsavel);
    const cta = portalCta(portalUrl);

    const result = await sendEmail({
      to,
      subject: `[Sprint] Nova ação no check-list: ${item.texto}`,
      text: `Olá, ${displayName || responsavel},\n\nVocê foi adicionado como responsável pela ação "${item.texto}" na execução "${next.entrega || 'Entrega'}" (iniciativa "${canvas.nomeIniciativa || 'Iniciativa'}").\n\nPrazo: ${item.prazo || next.prazo || 'a definir'}\nProgresso: ${item.progresso ?? 0}%${cta.text}`,
      html: `<p>Olá, <strong>${displayName || responsavel}</strong>,</p><p>Você foi adicionado como responsável pela ação <strong>${item.texto}</strong> na execução <strong>${next.entrega || 'Entrega'}</strong>.</p><p>Prazo: ${item.prazo || next.prazo || 'a definir'} · Progresso: ${item.progresso ?? 0}%</p>${cta.html}`,
    });
    if (result.ok) sent += 1;
  }

  return { sent };
}

export async function sendChecklistReminderEmail(params: {
  canvas: ActionCanvas;
  delivery: ActionCanvasDelivery;
  item: DeliveryChecklistItem;
}): Promise<{ sent: boolean; demoMode?: boolean; reason?: string }> {
  const { canvas, delivery, item } = params;
  const responsavel = (item.responsavel || '').trim();
  if (!responsavel) {
    return { sent: false, reason: 'Defina um responsável na ação antes de enviar o lembrete.' };
  }

  const { email: to, displayName, matchedMember } = await resolveAssigneeEmail(canvas.userId, responsavel);
  if (!to) {
    return {
      sent: false,
      reason: matchedMember
        ? 'Membro encontrado na equipe, mas sem e-mail cadastrado. Atualize o e-mail em Minha Equipe.'
        : 'Não reconhecemos este nome na equipe. Selecione o membro na lista do check-list (não digite solto) e confira se ele tem e-mail em Minha Equipe.',
    };
  }

  const copy = await generateChecklistReminderCopy({
    canvas,
    delivery,
    item,
    assigneeName: displayName || responsavel,
  });

  if (!isEmailConfigured()) {
    return { sent: false, demoMode: true };
  }

  const result = await sendEmail({
    to,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });

  return { sent: result.ok, demoMode: result.demoMode || copy.demoMode };
}

/**
 * Notifica o responsável quando o campo `responsavel` muda em um risco.
 */
export async function notifyRiskAssignmentIfNeeded(params: {
  canvas: ActionCanvas;
  previous: ActionCanvas;
  riskId: string;
}): Promise<{ sent: boolean; demoMode?: boolean }> {
  const { canvas, previous, riskId } = params;
  const next = canvas.riscos.find((r) => r.id === riskId);
  const prev = previous.riscos.find((r) => r.id === riskId);
  if (!next) return { sent: false };

  const responsavel = (next.responsavel || '').trim();
  const prevResp = (prev?.responsavel || '').trim();
  if (!responsavel || responsavel === prevResp) return { sent: false };

  const { email: to, displayName } = await resolveAssigneeEmail(canvas.userId, responsavel);
  if (!to) return { sent: false };

  if (!isEmailConfigured()) {
    return { sent: false, demoMode: true };
  }

  const initiative = canvas.nomeIniciativa || 'Iniciativa';
  const risco = next.risco || 'Risco';
  const plano = next.acaoTomar || 'a definir';
  const result = await sendEmail({
    to,
    subject: `[Sprint] Você foi designado a um risco: ${risco}`,
    text: `Olá, ${displayName},\n\nVocê foi designado como responsável pelo risco "${risco}" na iniciativa "${initiative}".\n\nPlano / ação a tomar: ${plano}\nImpacto: ${next.impacto || 'a definir'}\nProbabilidade: ${next.probabilidade || 'a definir'}\nStatus: ${next.status || 'nao_iniciado'}\n\nAcesse o Sprint para acompanhar a Difusão.\n`,
    html: `<p>Olá, <strong>${displayName}</strong>,</p><p>Você foi designado como responsável pelo risco <strong>${risco}</strong> na iniciativa <strong>${initiative}</strong>.</p><p><strong>Plano / ação a tomar:</strong> ${plano}</p><p>Impacto: ${next.impacto || 'a definir'} · Probabilidade: ${next.probabilidade || 'a definir'} · Status: ${next.status || 'nao_iniciado'}</p><p>Acesse o Sprint para acompanhar a Difusão.</p>`,
  });

  return { sent: result.ok, demoMode: result.demoMode };
}

/**
 * Envia reminder (texto gerado por IA) ao responsável do risco.
 */
export async function sendRiskReminderEmail(params: {
  canvas: ActionCanvas;
  risk: ActionCanvasRisk;
}): Promise<{ sent: boolean; demoMode?: boolean; reason?: string }> {
  const { canvas, risk } = params;
  const responsavel = (risk.responsavel || '').trim();
  if (!responsavel) {
    return { sent: false, reason: 'Defina um responsável antes de enviar o reminder.' };
  }

  const { email: to, displayName, matchedMember } = await resolveAssigneeEmail(canvas.userId, responsavel);
  if (!to) {
    return {
      sent: false,
      reason: matchedMember
        ? 'Membro encontrado na equipe, mas sem e-mail cadastrado. Atualize o e-mail em Minha Equipe.'
        : 'Não reconhecemos este nome na equipe. Selecione o membro na lista (não digite solto) e confira se ele tem e-mail em Minha Equipe.',
    };
  }

  const copy = await generateRiskReminderCopy({
    canvas,
    risk,
    assigneeName: displayName || responsavel,
  });
  if (!isEmailConfigured()) {
    return { sent: false, demoMode: true };
  }

  const result = await sendEmail({
    to,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });

  return { sent: result.ok, demoMode: result.demoMode || copy.demoMode };
}
