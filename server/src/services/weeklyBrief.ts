import type { ActionCanvas, Objective, TeamMember } from '../types';
import { COLLECTIONS, listAll, listByUser } from './storage';
import { env } from '../config/env';
import { sendEmail } from './email';
import type { UserProfile } from './users';
import { logActivity } from './activities';

export interface WeeklyBriefPayload {
  projectLabel: string;
  inProgress: number;
  completed: number;
  atRisk: number;
  momentum: Array<{ label: string; direction: 'up' | 'down' | 'flat' }>;
  recommendation: string;
}

function deptOf(member: TeamMember): string {
  return (member.departamento || member.cargo || 'Equipe').trim() || 'Equipe';
}

function buildWeeklyBrief(
  objectives: Objective[],
  canvases: ActionCanvas[],
  team: TeamMember[],
  projectLabel: string
): WeeklyBriefPayload {
  const deliveries = canvases.flatMap((c) => c.entregas.filter((e) => e.entrega?.trim()));
  const inProgress =
    objectives.filter((o) => o.status === 'em_andamento').length +
    deliveries.filter((e) => e.status !== 'verde' && e.status !== 'vermelho').length;
  const completed =
    objectives.filter((o) => o.status === 'concluido').length +
    deliveries.filter((e) => e.status === 'verde').length;
  const atRisk = deliveries.filter((e) => e.status === 'vermelho').length;

  const byDept = new Map<string, { green: number; red: number; yellow: number }>();
  for (const member of team) {
    const key = deptOf(member);
    if (!byDept.has(key)) byDept.set(key, { green: 0, red: 0, yellow: 0 });
  }
  for (const d of deliveries) {
    const owner = (d.responsavel || '').toLowerCase();
    const member = team.find((m) => owner && m.nome.toLowerCase().includes(owner.split(' ')[0]));
    const key = member ? deptOf(member) : 'Geral';
    const bucket = byDept.get(key) ?? { green: 0, red: 0, yellow: 0 };
    if (d.status === 'verde') bucket.green += 1;
    else if (d.status === 'vermelho') bucket.red += 1;
    else if (d.status === 'amarelo') bucket.yellow += 1;
    byDept.set(key, bucket);
  }

  const momentum = [...byDept.entries()]
    .map(([label, stats]) => {
      const score = stats.green * 2 - stats.red * 3 - stats.yellow;
      const direction: 'up' | 'down' | 'flat' =
        score > 0 ? 'up' : score < 0 ? 'down' : 'flat';
      return { label, direction, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ label, direction }) => ({ label, direction }));

  if (momentum.length === 0) {
    momentum.push({ label: 'Equipe', direction: 'flat' });
  }

  const weakest = momentum.find((m) => m.direction === 'down') ?? momentum[0];
  let recommendation = 'Mantenha a cadência de check-ins e revise o Health Score no ID.';
  if (atRisk > 0) {
    recommendation = `Concentre esforços nas ${atRisk} entrega${atRisk > 1 ? 's' : ''} em risco no Action Canvas.`;
  } else if (weakest?.direction === 'down') {
    recommendation = `Concentre esforços na equipe de ${weakest.label}.`;
  } else if (inProgress === 0) {
    recommendation = 'Defina próximas entregas no Action Canvas para manter o ritmo do sprint.';
  }

  return {
    projectLabel,
    inProgress,
    completed,
    atRisk,
    momentum,
    recommendation,
  };
}

function formatBriefEmail(toName: string, brief: WeeklyBriefPayload): { html: string; text: string } {
  const arrow = (d: WeeklyBriefPayload['momentum'][number]['direction']) =>
    d === 'up' ? '↑' : d === 'down' ? '↓' : '→';

  const text = [
    `Sprint Weekly Brief`,
    '',
    `Olá${toName ? `, ${toName}` : ''},`,
    '',
    `Projeto: ${brief.projectLabel}`,
    `Total de ações em curso: ${brief.inProgress}`,
    `Concluídos: ${brief.completed}`,
    `Em risco: ${brief.atRisk}`,
    '',
    'Momentum:',
    ...brief.momentum.map((m) => `${arrow(m.direction)} ${m.label}`),
    '',
    'Principal recomendação:',
    brief.recommendation,
    '',
    `Abrir Intelligence Dashboard: ${env.frontendUrl}/dashboard/inicio`,
  ].join('\n');

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;color:#1a1510;line-height:1.55">
      <p style="color:#af9270;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Sprint · Weekly Brief</p>
      <h1 style="font-size:22px;margin:0 0 12px">Sprint Weekly Brief</h1>
      <p>Olá${toName ? `, ${toName}` : ''} — resumo semanal de <strong>${brief.projectLabel}</strong>.</p>
      <ul style="padding-left:18px">
        <li>Total de ações em curso: <strong>${brief.inProgress}</strong></li>
        <li>Concluídos: <strong>${brief.completed}</strong></li>
        <li>Em risco: <strong>${brief.atRisk}</strong></li>
      </ul>
      <h2 style="font-size:15px;color:#af9270">Momentum</h2>
      <ul style="padding-left:18px;list-style:none">${brief.momentum
        .map((m) => `<li>${arrow(m.direction)} ${m.label}</li>`)
        .join('')}</ul>
      <h2 style="font-size:15px;color:#6a8f5a">Principal recomendação</h2>
      <p>${brief.recommendation}</p>
      <p style="margin-top:24px">
        <a href="${env.frontendUrl}/dashboard/inicio" style="display:inline-block;color:#fff;background:#af9270;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Abrir Intelligence Dashboard</a>
      </p>
    </div>
  `;

  return { html, text };
}

export async function sendWeeklyBriefForUser(
  userId: string,
  email: string,
  displayName?: string
): Promise<{ ok: boolean; demoMode: boolean; skipped?: boolean; preview?: string }> {
  if (!email?.trim()) {
    return { ok: false, demoMode: false, skipped: true };
  }

  const [objectives, canvases, team] = await Promise.all([
    listByUser<Objective>(COLLECTIONS.objectives, userId),
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId),
    listByUser<TeamMember>(COLLECTIONS.teamMembers, userId),
  ]);

  const brief = buildWeeklyBrief(
    objectives,
    canvases,
    team,
    displayName ? `People Sprint · ${displayName}` : 'People Sprint'
  );
  const { html, text } = formatBriefEmail(displayName?.split(/\s+/)[0] || '', brief);

  const result = await sendEmail({
    to: email.trim(),
    subject: 'Sprint Weekly Brief',
    html,
    text,
  });

  await logActivity(userId, 'weekly_brief', 'Sprint Weekly Brief enviado', {
    entidade: 'user',
    entidadeId: userId,
    metadata: { email, demoMode: result.demoMode },
  });

  return result;
}

export async function sendWeeklyBriefsToAllLeaders(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  const profiles = await listAll<UserProfile>(COLLECTIONS.userProfiles, 'lastSeenAt');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles) {
    const userId = profile.userId || profile.id;
    const email = profile.email?.trim();
    if (!userId || !email) {
      skipped += 1;
      continue;
    }
    try {
      const result = await sendWeeklyBriefForUser(userId, email, profile.displayName);
      if (result.skipped) skipped += 1;
      else if (result.ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, skipped, failed };
}
