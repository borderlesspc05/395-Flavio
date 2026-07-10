import { TeamMemberDevelopmentEntry, DevelopmentTrend } from '../types';
import { COLLECTIONS, create, getById, listByUser, update } from './storage';
import { generateId, nowIso } from '../utils/id';
import { logActivity } from './activities';
import type { TeamMember } from '../types';

const TREND_THRESHOLD = 3;

export function computeDevelopmentTrend(
  previousScore: number | undefined,
  newScore: number
): { trend: DevelopmentTrend; delta?: number } {
  if (previousScore === undefined) {
    return { trend: 'stable' };
  }
  const delta = newScore - previousScore;
  if (delta >= TREND_THRESHOLD) return { trend: 'improved', delta };
  if (delta <= -TREND_THRESHOLD) return { trend: 'declined', delta };
  return { trend: 'stable', delta };
}

export async function listDevelopmentEntries(
  userId: string,
  memberId: string
): Promise<TeamMemberDevelopmentEntry[]> {
  const items = await listByUser<TeamMemberDevelopmentEntry>(
    COLLECTIONS.teamMemberDevelopment,
    userId,
    'createdAt'
  );
  return items.filter((entry) => entry.memberId === memberId);
}

export async function createDevelopmentEntry(
  userId: string,
  memberId: string,
  input: { score: number; notes?: string; cycleId?: string }
): Promise<{ entry: TeamMemberDevelopmentEntry; member: TeamMember }> {
  const member = await getById<TeamMember>(COLLECTIONS.teamMembers, memberId);
  if (!member || member.userId !== userId) {
    throw new Error('Team member not found');
  }

  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  const previous = await listDevelopmentEntries(userId, memberId);
  const latestScore = previous[0]?.score ?? member.performance;
  const { trend, delta } = computeDevelopmentTrend(latestScore, score);

  const id = generateId();
  const entry: TeamMemberDevelopmentEntry = {
    id,
    userId,
    memberId,
    score,
    notes: input.notes?.trim() || undefined,
    trend,
    delta,
    cycleId: input.cycleId,
    createdAt: nowIso(),
  };

  await create(COLLECTIONS.teamMemberDevelopment, id, entry as unknown as Record<string, unknown>);

  const updatedMember = await update<TeamMember>(COLLECTIONS.teamMembers, memberId, {
    performance: score,
  });

  await logActivity(userId, 'team_development', `Check-in de desenvolvimento: ${member.nome} (${score}%)`, {
    entidade: 'teamMember',
    entidadeId: memberId,
    metadata: { score, trend, delta },
  });

  return { entry, member: updatedMember ?? { ...member, performance: score } };
}
