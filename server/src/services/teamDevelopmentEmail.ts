import { ActionCanvas, Objective, TeamMember } from '../types';
import { listByUser, COLLECTIONS } from './storage';
import { env } from '../config/env';
import { sendEmail } from './email';
import { logActivity } from './activities';

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function matchesMember(name: string, member: TeamMember): boolean {
  const n = normalize(name);
  const memberName = normalize(member.nome);
  if (!n || !memberName) return false;
  return n.includes(memberName) || memberName.includes(n);
}

function buildDevelopmentSummary(
  member: TeamMember,
  objectives: Objective[],
  canvases: ActionCanvas[]
): { html: string; text: string; highlights: string[] } {
  const relatedObjectives = objectives.filter(
    (o) => o.responsavel && matchesMember(o.responsavel, member)
  );
  const deliveries = canvases.flatMap((c) =>
    c.entregas
      .filter((e) => e.entrega.trim() && e.responsavel && matchesMember(e.responsavel, member))
      .map((e) => ({
        canvas: c.nomeIniciativa,
        entrega: e.entrega,
        status: e.status,
        evidencia: e.evidencia,
      }))
  );

  const highlights: string[] = [];
  const improvements: string[] = [];

  for (const obj of relatedObjectives) {
    if (obj.status === 'concluido') {
      highlights.push(`Objetivo concluído: ${obj.titulo}`);
    } else if (obj.status === 'em_andamento') {
      improvements.push(`Avançar objetivo: ${obj.titulo}${obj.impacto ? ` — ${obj.impacto}` : ''}`);
    } else {
      improvements.push(`Iniciar objetivo: ${obj.titulo}`);
    }
  }

  for (const d of deliveries) {
    if (d.status === 'verde') {
      highlights.push(`Entrega no ritmo: ${d.entrega} (${d.canvas})`);
    } else if (d.status === 'amarelo') {
      improvements.push(`Atenção na entrega: ${d.entrega} — reforçar evidência e prazo`);
    } else if (d.status === 'vermelho') {
      improvements.push(`Desbloquear entrega: ${d.entrega} — alinhar com sponsor`);
    }
  }

  if (highlights.length === 0 && relatedObjectives.length === 0 && deliveries.length === 0) {
    improvements.push(
      'Ainda não há objetivos ou entregas vinculados ao seu nome. Alinhe com o líder do sprint suas frentes na Difusão.'
    );
  }

  const profileUrl = `${env.frontendUrl}/colaborador/${member.id}`;
  const dashboardUrl = `${env.frontendUrl}/dashboard`;

  const text = [
    `Olá, ${member.nome},`,
    '',
    'Seu resumo de desenvolvimento no Magnus Mind:',
    '',
    highlights.length ? 'Destaques:' : '',
    ...highlights.map((h) => `• ${h}`),
    '',
    improvements.length ? 'O que melhorar agora:' : '',
    ...improvements.map((i) => `• ${i}`),
    '',
    `Ver seu perfil de desenvolvimento: ${profileUrl}`,
    `Acesse o app: ${dashboardUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;color:#1a1510;line-height:1.55">
      <p style="color:#af9270;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Magnus Mind · Desenvolvimento</p>
      <h1 style="font-size:22px;margin:0 0 12px">Olá, ${member.nome}</h1>
      <p>Segue seu panorama personalizado no People Sprint — o que evoluiu e o que pede atenção.</p>
      ${
        highlights.length
          ? `<h2 style="font-size:15px;color:#6a8f5a">Destaques</h2><ul>${highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`
          : ''
      }
      ${
        improvements.length
          ? `<h2 style="font-size:15px;color:#af9270">O que melhorar agora</h2><ul>${improvements.map((i) => `<li>${i}</li>`).join('')}</ul>`
          : ''
      }
      <p style="margin-top:24px">
        <a href="${profileUrl}" style="display:inline-block;margin-bottom:12px;color:#fff;background:#af9270;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Ver meu perfil de desenvolvimento</a><br/>
        <a href="${dashboardUrl}" style="color:#af9270;font-weight:600">Abrir Magnus Mind</a>
      </p>
    </div>
  `;

  return { html, text, highlights };
}

export async function sendTeamMemberDevelopmentEmail(
  userId: string,
  memberId: string,
  cycleId?: string
): Promise<{ ok: boolean; demoMode: boolean; preview?: string }> {
  const { getById } = await import('./storage');
  const member = await getById<TeamMember>(COLLECTIONS.teamMembers, memberId);
  if (!member || member.userId !== userId) {
    throw new Error('Team member not found');
  }
  if (!member.email?.trim()) {
    throw new Error('Team member has no email');
  }

  const [objectives, canvases] = await Promise.all([
    listByUser<Objective>(COLLECTIONS.objectives, userId, 'createdAt', cycleId),
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId, 'createdAt', cycleId),
  ]);

  const { html, text } = buildDevelopmentSummary(member, objectives, canvases);

  const result = await sendEmail({
    to: member.email.trim(),
    subject: `${member.nome} — seu desenvolvimento no Magnus Mind`,
    html,
    text,
  });

  await logActivity(userId, 'team_email', `Email de desenvolvimento enviado para ${member.nome}`, {
    entidade: 'teamMember',
    entidadeId: memberId,
    metadata: { email: member.email, demoMode: result.demoMode },
  });

  return result;
}
