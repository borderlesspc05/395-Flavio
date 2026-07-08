import { getFirestore } from './firebase';
import { listAll, COLLECTIONS } from './storage';
import { getRequestTypeLabel, listApiRequestLogs } from './apiRequestLog';
import type { UserProfile } from './users';
import type { SubscriptionRecord } from './subscriptions';
import { getSubscriptionByEmail } from './subscriptions';
import { getPlanSummaryForUser } from './subscriptions';

export interface AdminUserDetailPlan extends Awaited<ReturnType<typeof getPlanSummaryForUser>> {
  hasActiveSubscription: boolean;
}

export interface AdminUserDetail {
  profile: UserProfile | null;
  plan: AdminUserDetailPlan;
  subscription: SubscriptionRecord | null;
  diagnostic: {
    organization?: string;
    product?: string;
    stage?: string;
    mainChallenge?: string;
    challengeCategories?: string[];
    completedAt?: string;
    draftUpdatedAt?: string;
  } | null;
  cycles: Array<{
    id: string;
    label: string;
    status: string;
    cycleNumber?: number;
    completedAt?: string;
  }>;
  gate: {
    selectedPath?: string;
    aiRecommendedPath?: string;
    rationale?: string;
    skipped?: boolean;
  } | null;
  recentRequests: Array<{
    id: string;
    createdAt: string;
    typeLabel: string;
    statusCode: number;
    durationMs: number;
  }>;
  counts: {
    objectives: number;
    actionCanvases: number;
    reports: number;
    conversations: number;
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const [profilesR, objectivesR, canvasesR, reportsR, conversationsR, logs] = await Promise.all([
    listAll<UserProfile>(COLLECTIONS.userProfiles).catch(() => [] as UserProfile[]),
    listAll<{ userId?: string }>(COLLECTIONS.objectives).catch(() => []),
    listAll<{ userId?: string }>(COLLECTIONS.actionCanvases).catch(() => []),
    listAll<{ userId?: string }>(COLLECTIONS.reports).catch(() => []),
    listAll<{ userId?: string }>(COLLECTIONS.conversations).catch(() => []),
    listApiRequestLogs(0),
  ]);

  const profiles = profilesR;
  const objectives = objectivesR;
  const canvases = canvasesR;
  const reports = reportsR;
  const conversations = conversationsR;

  const profile = profiles.find((p) => p.userId === userId) ?? null;
  const email = profile?.email ?? '';
  const subscription = email ? await getSubscriptionByEmail(email) : null;
  const plan = await getPlanSummaryForUser(userId);

  const planSummary = {
    planId: plan.planId,
    planName: plan.planName,
    concurrencyLimit: plan.concurrencyLimit,
    maxOpenCycles: plan.maxOpenCycles,
    isDemoPlan: plan.isDemoPlan,
    hasActiveSubscription: subscription?.status === 'active',
  };

  const userLogs = logs
    .filter((l) => l.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40)
    .map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      typeLabel: getRequestTypeLabel(l.requestType),
      statusCode: l.statusCode,
      durationMs: l.durationMs,
    }));

  let diagnostic: AdminUserDetail['diagnostic'] = null;
  let cycles: AdminUserDetail['cycles'] = [];
  let gate: AdminUserDetail['gate'] = null;

  const db = getFirestore();
  if (db) {
    try {
      const formSnap = await db.collection('initialForms').doc(userId).get();
      if (formSnap.exists) {
        const d = formSnap.data() as Record<string, unknown>;
        const categories = Array.isArray(d.desafioRelacionadoA)
          ? d.desafioRelacionadoA.map(String)
          : String(d.desafioRelacionadoA ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
        diagnostic = {
          organization: String(d.organizacao ?? '').trim() || undefined,
          product: String(d.produtoServico ?? '').trim() || undefined,
          stage: String(d.estagioNegocio ?? '').trim() || undefined,
          mainChallenge: String(d.desafioPrincipal ?? '').trim() || undefined,
          challengeCategories: categories.length ? categories : undefined,
          completedAt: typeof d.completedAt === 'string' ? d.completedAt : undefined,
          draftUpdatedAt: typeof d.draftUpdatedAt === 'string' ? d.draftUpdatedAt : undefined,
        };
      }
    } catch (err) {
      console.warn('[adminUserDetail] initialForms read failed:', err);
    }

    try {
      const cyclesSnap = await db
        .collection('diagnosticCycles')
        .where('userId', '==', userId)
        .limit(20)
        .get();
      cycles = cyclesSnap.docs.map((doc) => {
        const c = doc.data() as {
          label?: string;
          status?: string;
          cycleNumber?: number;
          completedAt?: string;
        };
        return {
          id: doc.id,
          label: String(c.label ?? 'Ciclo'),
          status: String(c.status ?? 'draft'),
          cycleNumber: c.cycleNumber,
          completedAt: c.completedAt,
        };
      });
    } catch (err) {
      console.warn('[adminUserDetail] diagnosticCycles read failed:', err);
    }

    try {
      const gateSnap = await db.collection('blueprintGate').doc(userId).get();
      if (gateSnap.exists) {
        const g = gateSnap.data() as AdminUserDetail['gate'];
        gate = g ?? null;
      }
    } catch (err) {
      console.warn('[adminUserDetail] blueprintGate read failed:', err);
    }
  }

  const matchUser = (row: { userId?: string }) => row.userId === userId;

  return {
    profile,
    plan: planSummary,
    subscription,
    diagnostic,
    cycles,
    gate,
    recentRequests: userLogs,
    counts: {
      objectives: objectives.filter(matchUser).length,
      actionCanvases: canvases.filter(matchUser).length,
      reports: reports.filter(matchUser).length,
      conversations: conversations.filter(matchUser).length,
    },
  };
}
