import { sendEmail, isEmailConfigured } from './email';
import type { ActionCanvas } from '../types';

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Notifica o responsável quando o campo `responsavel` muda em uma entrega.
 * Só envia se o valor parecer um e-mail (ou contenha um).
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

  const responsavel = (next.responsavel || '').trim();
  const prevResp = (prev?.responsavel || '').trim();
  if (!responsavel || responsavel === prevResp) return { sent: false };

  const emailMatch = responsavel.match(/[^\s<>]+@[^\s<>]+/);
  const to = emailMatch?.[0] || (looksLikeEmail(responsavel) ? responsavel : '');
  if (!to) return { sent: false };

  if (!isEmailConfigured()) {
    return { sent: false, demoMode: true };
  }

  const initiative = canvas.nomeIniciativa || 'Iniciativa';
  const entrega = next.entrega || 'Entrega';
  const result = await sendEmail({
    to,
    subject: `[Sprint] Você foi designado: ${entrega}`,
    text: `Olá,\n\nVocê foi designado como responsável pela entrega "${entrega}" na iniciativa "${initiative}".\nPrazo: ${next.prazo || 'a definir'}.\n\nAcesse o Sprint para acompanhar a Difusão.\n`,
    html: `<p>Olá,</p><p>Você foi designado como responsável pela entrega <strong>${entrega}</strong> na iniciativa <strong>${initiative}</strong>.</p><p>Prazo: ${next.prazo || 'a definir'}.</p><p>Acesse o Sprint para acompanhar a Difusão.</p>`,
  });

  return { sent: result.ok, demoMode: result.demoMode };
}
